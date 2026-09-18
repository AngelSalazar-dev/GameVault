import { NextResponse } from "next/server";
import { getClientIp, getGeoData } from "@/lib/security";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const geo = await getGeoData(ip);

  if (!geo) {
    return NextResponse.json({ ip, error: "No se pudo obtener ubicación" });
  }

  return NextResponse.json({
    ip,
    country: geo.country,
    countryCode: geo.countryCode,
    city: geo.city,
    region: geo.regionName,
    isp: geo.isp,
    proxy: geo.proxy,
    hosting: geo.hosting,
  });
}
