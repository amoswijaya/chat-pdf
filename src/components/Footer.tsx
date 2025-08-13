const Footer = () => {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} ChatPDF AI
        </p>
        <div className="flex items-center gap-5 text-sm text-white/70">
          <a href="/privacy" className="hover:text-white">
            Privacy
          </a>
          <a href="/terms" className="hover:text-white">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
