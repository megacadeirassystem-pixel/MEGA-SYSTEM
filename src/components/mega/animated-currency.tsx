"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion/react";

/** Conta a receita do mês a partir de zero na primeira carga — o único "momento" de abertura do
 * Comando Central, já que é literalmente o número mais importante da tela. */
export function AnimatedCurrency({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !ref.current) {
      if (ref.current) ref.current.textContent = value.toFixed(decimals).replace(".", ",");
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (ref.current) ref.current.textContent = latest.toFixed(decimals).replace(".", ",");
      },
    });
    return controls.stop;
  }, [value, decimals]);

  return <span ref={ref}>{(0).toFixed(decimals).replace(".", ",")}</span>;
}
