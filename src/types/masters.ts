export type MasterFieldType = "STRING" | "TEXT" | "BOOLEAN" | "INTEGER" | "DECIMAL" | "DATE";

export type MasterField = {
  name: string;
  type: MasterFieldType;
  required: boolean;
};

export type MasterRegistryEntry = {
  id: number;
  name: string;
  modelKey: string;
  required_fields: string[];
};
