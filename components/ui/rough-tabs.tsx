"use client";

import * as React from "react";
import { RoughNotation } from "react-rough-notation";
import { cn } from "@/lib/utils";

interface RoughTabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const RoughTabsContext = React.createContext<RoughTabsContextValue | null>(null);

function useRoughTabs() {
  const context = React.useContext(RoughTabsContext);
  if (!context) {
    throw new Error("RoughTabs components must be used within a RoughTabs");
  }
  return context;
}

interface RoughTabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function RoughTabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className,
}: RoughTabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isControlled, onValueChange]
  );

  return (
    <RoughTabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </RoughTabsContext.Provider>
  );
}

interface RoughTabsListProps {
  children: React.ReactNode;
  className?: string;
}

function RoughTabsList({ children, className }: RoughTabsListProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {children}
    </div>
  );
}

interface RoughTabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  color?: string;
  strokeWidth?: number;
  animationDuration?: number;
  iterations?: number;
  padding?: number | [number, number] | [number, number, number, number];
}

function RoughTabsTrigger({
  value,
  children,
  className,
  color = "#333",
  strokeWidth = 1.5,
  animationDuration = 300,
  iterations = 1,
  padding = [2, 6],
}: RoughTabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useRoughTabs();
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={cn(
        "px-4 py-2 text-sm font-medium transition-colors",
        "hover:text-primary",
        isSelected ? "text-foreground" : "text-muted-foreground",
        className
      )}
    >
      <RoughNotation
        type="bracket"
        show={isSelected}
        color={color}
        strokeWidth={strokeWidth}
        animationDuration={animationDuration}
        iterations={iterations}
        brackets={["left", "right"]}
        padding={padding}
      >
        {children}
      </RoughNotation>
    </button>
  );
}

interface RoughTabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function RoughTabsContent({ value, children, className }: RoughTabsContentProps) {
  const { value: selectedValue } = useRoughTabs();

  if (selectedValue !== value) {
    return null;
  }

  return <div className={cn("mt-4", className)}>{children}</div>;
}

export { RoughTabs, RoughTabsList, RoughTabsTrigger, RoughTabsContent };
