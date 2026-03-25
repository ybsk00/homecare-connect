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
    <footer id="contact" className="bg-surface-container-low py-16">
      <div className="mx-auto max-w-7xl px-8">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="/" className="text-lg font-bold tracking-tighter text-primary font-headline">
              HomeCare Connect
            </a>
            <p className="mt-4 text-sm leading-relaxed text-on-surface/80 font-body">
              AI 기반 방문치료 매칭 &amp; 운영 SaaS 플랫폼
            </p>
            <p className="mt-2 text-sm text-on-surface/80 font-body">주식회사 온케어</p>
          </div>

          {/* Link columns */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-on-surface font-headline">
                {group.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-on-surface/60 transition-colors hover:text-on-surface hover:underline decoration-secondary underline-offset-4 font-body"
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
        <div className="mt-14 border-t border-outline-variant/15 pt-8">
          <p className="text-center text-sm text-on-surface/40 font-body">
            &copy; 2026 HomeCare Connect. AI-Driven Empathetic Care.
          </p>
        </div>
      </div>
    </footer>
  );
}
