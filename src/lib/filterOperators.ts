export type FilterTypeWithOperators = "text" | "date" | "number";

export type FilterOperatorOption = {
  value: string;
  label: string;
};

export const TEXT_OPERATORS: FilterOperatorOption[] = [
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Does not contain" },
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Does not equal" },
  { value: "startsWith", label: "Begins with" },
  { value: "endsWith", label: "Ends with" },
];

export const DATE_OPERATORS: FilterOperatorOption[] = [
  { value: "equals", label: "Equals" },
  { value: "inRange", label: "In range" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
];

export const NUMBER_OPERATORS: FilterOperatorOption[] = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Does not equal" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
  { value: "between", label: "Between" },
];

export function getOperatorsForFilterType(type: FilterTypeWithOperators): FilterOperatorOption[] {
  if (type === "date") return DATE_OPERATORS;
  if (type === "number") return NUMBER_OPERATORS;
  return TEXT_OPERATORS;
}

export function getDefaultOperator(type: FilterTypeWithOperators): string {
  if (type === "date") return "equals";
  if (type === "number") return "equals";
  return "contains";
}
