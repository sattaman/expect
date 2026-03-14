import { useEffect, useState } from "react";
import { useStdout } from "ink";

export const useStdoutDimensions = (): [columns: number, rows: number] => {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState<[number, number]>([stdout.columns, stdout.rows]);

  useEffect(() => {
    const onResize = () => setDimensions([stdout.columns, stdout.rows]);
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return dimensions;
};
