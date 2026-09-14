import type { MetadataRoute } from "next";

// 네이버 서치어드바이저 권장 형식(User-agent: * / Allow: / / Sitemap). 로그인·관리·신청 화면만 수집에서 뺍니다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/mypage", "/operations", "/admin", "/applications", "/family"] },
    sitemap: "https://www.firstfriend.me/sitemap.xml",
  };
}
