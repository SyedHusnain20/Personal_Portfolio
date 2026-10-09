import Effects from "@/components/Effects";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import NainiChat from "@/components/NainiChat";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <div className="scroll-progress" aria-hidden="true" />
      <canvas id="bg" aria-hidden="true" />
      <Header />
      {children}
      <Footer />
      <NainiChat />
      <Effects />
    </>
  );
}
