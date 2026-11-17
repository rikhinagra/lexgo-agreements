import type { ComponentProps } from "react";
import { Icon } from "@/components/icons";

type SelectProps = Omit<ComponentProps<"select">, "className"> & {
  /** Extra classes for the box around the select, for example a width. */
  wrapperClassName?: string;
};

/**
 * Dropdown with our own arrow. The browser's built in arrow sits right on the edge of the
 * box, so it is hidden and a Lucide arrow is drawn with proper space on the right.
 */
export function SelectField({ wrapperClassName = "", children, ...props }: SelectProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select {...props} className="input cursor-pointer appearance-none pr-11">
        {children}
      </select>
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate"
      />
    </div>
  );
}
