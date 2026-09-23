'use strict';

const buf = new Uint8Array(128);
const w = new Int32Array(80);

function sha1lz(str) {
	const len = str.length;
	let total = len + 1 + 8;
	total = (total + 63) & ~63;

	for (let i = 0; i < total; i++) buf[i] = 0;
	for (let i = 0; i < len; i++) buf[i] = str.charCodeAt(i) & 0xff;
	buf[len] = 0x80;

	const bitLen = len * 8;
	buf[total - 4] = (bitLen >>> 24) & 0xff;
	buf[total - 3] = (bitLen >>> 16) & 0xff;
	buf[total - 2] = (bitLen >>> 8) & 0xff;
	buf[total - 1] = bitLen & 0xff;

	let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE,
	    h3 = 0x10325476, h4 = 0xC3D2E1F0;

	for (let off = 0; off < total; off += 64) {
		for (let i = 0; i < 16; i++) {
			const j = off + i * 4;
			w[i] = (buf[j] << 24) | (buf[j + 1] << 16) | (buf[j + 2] << 8) | buf[j + 3];
		}
		for (let i = 16; i < 80; i++) {
			const v = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
			w[i] = (v << 1) | (v >>> 31);
		}

		let a = h0, b = h1, c = h2, d = h3, e = h4;
		for (let i = 0; i < 80; i++) {
			let f, k;
			if (i < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
			else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
			else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
			else { f = b ^ c ^ d; k = 0xCA62C1D6; }

			const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0;
			e = d; d = c; c = ((b << 30) | (b >>> 2)) | 0; b = a; a = t;
		}

		h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0;
		h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
	}

	let u = h0 >>> 0; if (u) return Math.clz32(u);
	u = h1 >>> 0; if (u) return 32 + Math.clz32(u);
	u = h2 >>> 0; if (u) return 64 + Math.clz32(u);
	u = h3 >>> 0; if (u) return 96 + Math.clz32(u);
	u = h4 >>> 0; if (u) return 128 + Math.clz32(u);
	return 160;
}

// how long one synchronous slice runs before yielding so pause/resume
// messages can be processed
const SLICE_MS = 100;

let running = false;
let paused = false;
let prefix = '';
let difficulty = 0;
let expected = 0;
let nonce = 0;
let activeMs = 0;
let reportedMs = 0;
let pauses = 0;

self.onmessage = function (e) {
	const d = e.data || {};
	if (d.cmd === 'start') {
		prefix = String(d.challenge) + ':';
		difficulty = d.difficulty | 0;
		expected = Math.pow(2, difficulty);
		nonce = 0;
		activeMs = 0;
		reportedMs = 0;
		pauses = 0;
		running = true;
		paused = false;
		tick();
	} else if (d.cmd === 'pause') {
		if (!paused) { paused = true; pauses++; }
	} else if (d.cmd === 'resume') {
		if (running && paused) {
			paused = false;
			tick();
		}
	} else if (d.cmd === 'stop') {
		running = false;
	}
};

function tick() {
	if (!running || paused) return;

	const chunkStart = Date.now();

	do {
		for (let i = 0; i < 4096; i++) {
			if (sha1lz(prefix + nonce) >= difficulty) {
				activeMs += Date.now() - chunkStart;
				self.postMessage({ type: 'done', nonce: nonce, hashes: nonce + 1, ms: Math.round(activeMs), pauses: pauses });
				running = false;
				return;
			}
			nonce++;
		}
	} while (Date.now() - chunkStart < SLICE_MS);

	activeMs += Date.now() - chunkStart;

	if (activeMs - reportedMs >= 150) {
		reportedMs = activeMs;
		self.postMessage({
			type: 'progress',
			hashes: nonce,
			ms: Math.round(activeMs),
			progress: 1 - Math.exp(-nonce / expected)
		});
	}

	setTimeout(tick, 0);
}
