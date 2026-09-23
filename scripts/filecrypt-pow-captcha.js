(function () {
    'use strict';

    let _sig = null;
    function loadSignals(url) {
        if (!url) return;
        import(url).then(function (m) {
            _sig = (m && (m.S || (m.default && m.default.S))) || null;
            if (_sig && _sig.start) { try { _sig.start(); } catch (e) { } }
        }).catch(function () { });
    }


    function init() {
        let el = document.getElementById('pow-captcha');
        if (!el) return;

        let box = el.querySelector('.pow-captcha__box');
        let labelEl = el.querySelector('.pow-captcha__label');
        let progressBar = el.querySelector('.pow-captcha__progress i');
        let idInput = el.querySelector('input[name="pow_id"]');
        let nonceInput = el.querySelector('input[name="pow_nonce"]');
        let elapsedInput = el.querySelector('input[name="pow_elapsed"]');
        let pausesInput = el.querySelector('input[name="pow_pauses"]');
        let dataInput = el.querySelector('input[name="pow_data"]');
        let xInput = el.querySelector('input[name="pow_x"]');

        let sessionUrl = el.getAttribute('data-session');
        let isAutoSolve = false;//el.getAttribute('data-auto-solve') === 'true';
        let workerUrl = el.getAttribute('data-worker');
        let xUrl = el.getAttribute('data-ext');
        let sigUrl = el.getAttribute('data-sig');


        let yUrls = (el.getAttribute('data-px') || '').split(',')
            .map(function (s) { return s.trim(); }).filter(Boolean);
        let yNonce = (function () {
            try {
                let a = new Uint32Array(2); crypto.getRandomValues(a);
                return a[0].toString(36) + a[1].toString(36);
            } catch (_) { return String(Date.now()) + Math.random().toString(36).slice(2); }
        })();

        loadSignals(sigUrl);

        let txt = {
            idle: el.getAttribute('data-text-idle'),
            working: el.getAttribute('data-text-working'),
            done: el.getAttribute('data-text-done'),
            fail: el.getAttribute('data-text-fail')
        };

        let state = 'idle';
        let worker = null;
        let xPromise = null;
        let yPromise = null;

        function startX() {
            if (xPromise || !xUrl) return;
            xPromise = (async function () {
                try {
                    let m = await import(xUrl);
                    let fn = m && (m.R || (m.default && m.default.R));
                    return fn ? await fn() : '';
                } catch (_) {
                    return '';
                }
            })();
        }

        function startY() {
            if (yPromise || !yUrls.length) return;
            yPromise = (async function () {
                for (let i = 0; i < yUrls.length; i++) {
                    let u = yUrls[i];
                    u += (u.indexOf('?') === -1 ? '?' : '&') + 't=' + yNonce;
                    let ctl = new AbortController();
                    let to = setTimeout(function () { ctl.abort(); }, 10000);
                    try {
                        let r = await fetch(u, { cache: 'no-store', mode: 'cors', signal: ctl.signal });
                        if (r.ok) {
                            let j = await r.json();
                            if (j && j.cid) return j.cid;
                        }
                    } catch (_) {
                        // fall through to the next endpoint
                    } finally {
                        clearTimeout(to);
                    }
                }
                return '';
            })();
        }

        let challengePromise = null;
        let challengeAt = 0;

        function fetchChallenge() {
            if (challengePromise && (Date.now() - challengeAt) < 480000) {
                return challengePromise;
            }
            challengeAt = Date.now();
            challengePromise = (async function () {

                function raced(p) {
                    return p ? Promise.race([
                        p, new Promise(function (res) { setTimeout(function () { res(''); }, 3000); })
                    ]) : Promise.resolve('');
                }
                let both = await Promise.all([raced(xPromise), raced(yPromise)]);
                let body = new URLSearchParams();
                body.set('pow_x', both[0] || '');
                body.set('pow_y', both[1] || '');
                body.set('pow_yn', yNonce);
                let tz = 'unknown';
                try {
                    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                } catch (_) {
                    tz = 'exception';
                }
                body.set('tz', tz);
                let r = await fetch(sessionUrl, { method: 'POST', cache: 'no-store', body: body });
                if (!r.ok) { challengeAt = 0; throw new Error('http ' + r.status); }
                let j = await r.json();
                let c = j && j.challenge;
                if (!c || !c.id || !c.challenge || !c.difficulty) { challengeAt = 0; throw new Error('bad session'); }
                c.autosolve = !!j.autosolve;
                return c;
            })().catch(function (e) {
                challengePromise = null;
                challengeAt = 0;
                throw e;
            });
            return challengePromise;
        }

        function setState(s) {
            state = s;
            el.setAttribute('data-state', s);
            box.setAttribute('aria-checked', s === 'done' ? 'true' : 'false');
        }

        function fail() {
            setState('fail');
            labelEl.textContent = txt.fail;
            if (worker) { worker.terminate(); worker = null; }
        }

        function submitForm() {
            let form = (box.closest && box.closest('form')) || document.getElementById('cform');
            setTimeout(function () {
                if (!form) return;
                if (form.requestSubmit) form.requestSubmit();
                else form.submit();
            }, 850);
        }

        function start(e) {
            if (e && _sig && _sig.recordClick) {
                try { _sig.recordClick(e); } catch (_) { }
            }
            if (state === 'working' || state === 'done') return;

            if (typeof Worker === 'undefined' || !workerUrl || !sessionUrl) {
                fail();
                return;
            }

            setState('working');
            labelEl.textContent = txt.working;
            startX();
            startY();

            fetchChallenge().then(function (c) {
                if (state !== 'working') return;
                if (idInput) idInput.value = c.id;

                try {
                    worker = new Worker(workerUrl);
                } catch (err) {
                    fail();
                    return;
                }

                worker.onmessage = function (e) {
                    let d = e.data || {};
                    if (d.type === 'progress') {
                        if (progressBar) progressBar.style.width = (d.progress * 100).toFixed(1) + '%';
                    } else if (d.type === 'done') {
                        if (progressBar) progressBar.style.width = '100%';
                        nonceInput.value = d.nonce;
                        if (elapsedInput) elapsedInput.value = d.ms;
                        if (pausesInput) pausesInput.value = d.pauses;
                        worker.terminate();
                        worker = null;
                        setState('done');
                        labelEl.textContent = txt.done;

                        (async function () {
                            try {
                                let r = xPromise ? await xPromise : '';
                                if (xInput && r) xInput.value = r;
                            } catch (_) { }
                            await new Promise(resolve => setTimeout(resolve, 500));
                            try {
                                if (dataInput && _sig && _sig.collect) dataInput.value = _sig.collect();
                            } catch (e) { }


                            submitForm();
                        })();
                    }
                };

                worker.onerror = function () { fail(); };
                worker.postMessage({ cmd: 'start', challenge: c.challenge, difficulty: parseInt(c.difficulty, 10) });
            }).catch(function () {
                fail();
            });
        }

        box.addEventListener("pointerdown", e => {
            if (_sig && _sig.recordPointer) {
                try { _sig.recordPointer(e); } catch (_) { }
            }
        });
        box.addEventListener('click', start);

        /*box.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter' || e.keyCode === 32 || e.keyCode === 13) {
                e.preventDefault();
                start();
            }
        });*/
        window.addEventListener('blur', function () {
            if (worker && state === 'working') worker.postMessage({ cmd: 'pause' });
        });
        window.addEventListener('focus', function () {
            if (worker && state === 'working') worker.postMessage({ cmd: 'resume' });
        });

        startX();
        startY();
        fetchChallenge().then(function (c) {
            if (isAutoSolve || c.autosolve) {
                setTimeout(function () { start(); }, 1000);
            }
        }).catch(function () { });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
