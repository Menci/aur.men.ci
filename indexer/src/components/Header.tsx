import Preact from "preact";
import { useRef, useState } from "preact/hooks";

type OS = "archlinux" | "manjaro";

export const Header: Preact.FunctionalComponent = () => {
  const [currentOs, setCurrentOs] = useState<OS>("archlinux");

  const refCopiedTimer = useRef(0);
  const refPacmanConfCode = useRef<HTMLElement>();
  const [copied, setCopied] = useState(false);
  function onCopy() {
    if (refCopiedTimer.current) {
      clearTimeout(refCopiedTimer.current);
      refCopiedTimer.current = 0;
    }

    navigator.clipboard.writeText(refPacmanConfCode.current.innerText).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        refCopiedTimer.current = 0;
      }, 5000);
    });
  }

  function onChangeOs(newOs: OS) {
    setCurrentOs(newOs);
    setCopied(false);
  }

  return (
    <>
      <header style="background-color: #f4f5f6; padding: 48px 0 32px; text-align: center; ">
        <div className="container">
          <h3 style="letter-spacing: 0.2px; font-weight: bolder; ">
            <a style="color: inherit; " href="https://men.ci" target="_blank">
              Menci
            </a>
            's Prebuilt AUR Repository
          </h3>
          <h4 style="letter-spacing: 0.2px; ">
            For{" "}
            <a href="https://archlinux.org">
              <span data-os="archlinux">Arch Linux</span>
            </a>{" "}
            and{" "}
            <a href="https://manjaro.org/">
              <span data-os="manjaro">Manjaro</span>
            </a>
          </h4>
        </div>
      </header>
      <section className="container" style="padding: 32px 0; ">
        <p>
          This is my personal <a href="https://wiki.archlinux.org/title/pacman">Pacman</a> repository that provides some
          packages from <a href="https://aur.archlinux.org">AUR</a>. To avoid compatibility issues, each package is
          built separately for{" "}
          <a href="https://archlinux.org">
            <span data-os="archlinux">Arch Linux</span>
          </a>{" "}
          and{" "}
          <a href="https://manjaro.org/">
            <span data-os="manjaro">Manjaro</span>
          </a>
          .
        </p>

        <p>
          Some packages are built for both <b>x86_64</b> and <b>aarch64</b> architecture.
        </p>

        <div className="os-buttons">
          {(
            [
              { os: "archlinux", name: "Arch Linux" },
              { os: "manjaro", name: "Manjaro" }
            ] as const
          ).map(({ os, name }) => (
            <button
              key={os}
              className={"button" + (currentOs === os ? "" : " button-outline")}
              data-os={os}
              onClick={() => onChangeOs(os)}
            >
              <span className={`icon fl-${os}`} />
              {name}
            </button>
          ))}
        </div>

        <pre className="pacman-conf">
          <code ref={refPacmanConfCode}>
            <span style="color: #4c8ae9; ">[menci]</span>
            <br />
            <span style="color: #eb61c6; ">SigLevel</span> = Never
            <br />
            <span style="color: #eb61c6; ">Server</span> = https://aur.men.ci/
            <span data-os={currentOs}>{currentOs}</span>/$arch
          </code>
          <code className="copy" onClick={onCopy}>
            {copied ? "Copied!" : "Copy"}
          </code>
        </pre>

        <p>
          All packages in the repository are built on <a href="https://github.com/features/actions">GitHub Actions</a>{" "}
          and hosted on <a href="https://azure.microsoft.com/en-us/services/storage/blobs/">Azure Blob Storage</a>. No
          self-hosted compute resources are invested for building and hosting the repository.
        </p>

        <p>
          See the source code on <a href="https://github.com/Menci/aur.men.ci">GitHub</a>.
        </p>
      </section>
    </>
  );
};
