import Preact from "preact";
import { useEffect, useState } from "preact/hooks";

import { Header } from "./components/Header";
import { TargetList } from "./components/TargetList";
import { Target, fetchTargetList } from "./data";

const apiRoot = import.meta.env.DEV ? "https://aur.men.ci" : "";

export const App: Preact.FunctionalComponent = () => {
  const [targetList, setTargetList] = useState<Target[]>(null);
  useEffect(() => {
    fetchTargetList(apiRoot).then(targets => setTargetList(targets));
  }, []);

  return (
    <>
      <Header />
      <TargetList targets={targetList} />
    </>
  );
};
