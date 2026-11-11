import Logo from "@/components/Logo";
import config from "@/config/config.json";
import menu from "@/config/menu.json";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-light dark:bg-darkmode-light">
      <div className="container">
        <div className="row items-center py-10">
          <div className="mb-8 text-center lg:col-4 lg:mb-0 lg:text-left">
            <Logo />
          </div>
          <div className="mb-8 text-center lg:col-8 lg:mb-0 lg:text-right">
            <ul>
              {menu.footer.map((m) => (
                <li className="m-3 inline-block" key={m.name}>
                  <Link href={m.url}>{m.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border py-7 dark:border-darkmode-border">
        <div className="container text-center text-text-light dark:text-darkmode-text-light">
          <p>{config.params.copyright}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
