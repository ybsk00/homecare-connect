import { HeartPulse } from 'lucide-react';

const linkGroups = [
  {
    title: '서비스',
    links: [
      { label: '환자/보호자', href: '#' },
      { label: '간호사', href: '#' },
      { label: '의료기관', href: '#' },
    ],
  },
  {
    title: '회사',
    links: [
      { label: '소개', href: '#' },
      { label: '채용', href: '#' },
      { label: '블로그', href: '#' },
    ],
  },
  {
    title: '지원',
    links: [
      { label: '고객센터', href: '#' },
      { label: '자주 묻는 질문', href: '#' },
      { label: '제휴 문의', href: '#contact' },
    ],
  },
  {
    title: '법적 고지',
    links: [
      { label: '개인정보처리방침', href: '#' },
      { label: '이용약관', href: '#' },
      { label: '접근성', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer id="contact" className="bg-primary py-16 text-white/80">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2">
              <HeartPulse className="h-6 w-6 text-secondary-container" />
              <span className="text-base font-bold text-white">
                HomeCare Connect
              </span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              AI 기반 방문치료 매칭 &amp; 운영 SaaS 플랫폼
            </p>
            <p className="mt-2 text-sm text-white/60">주식회사 루미브리즈</p>
          </div>

          {/* Link columns */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-white">
                {group.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 border-t border-white/10 pt-8">
          <p className="text-center text-sm text-white/40">
            &copy; 2024 HomeCare Connect. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
