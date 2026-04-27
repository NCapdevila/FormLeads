"use client";

import Select from "react-select";
import { useEffect, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
}: Props) {

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <Select
      options={options}
      value={selected}
      placeholder={placeholder}
      onChange={(option) => {
        if (option) {
          onChange(option.value);
        }
      }}
      isSearchable
    />
  );
}