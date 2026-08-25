export type AppNavNode = {
  id: string;
  label: string;
  href?: string;
  keywords?: string[];
  /** If set, only these roles (e.g. superadmin) see this node and its subtree. */
  allowedRoles?: string[];
  /**
   * Permission key (API `user.permissions`) required to show this leaf for non-superadmin users.
   * Omit for items visible to any authenticated user.
   */
  requiredPermission?: string;
  children?: AppNavNode[];
};
