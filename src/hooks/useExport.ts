import { useState, useCallback } from "react";

interface UseExportOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  fileName?: string;
}

/**
 * A hook to handle file exports from the API.
 * 
 * @param exportFn The service function that calls the API and returns a Promise<Blob>
 * @param fileName The default filename for the download.
 * @returns { exporting, handleExport }
 */
export function useExport(
  exportFn: (params: any) => Promise<Blob>, 
  options: UseExportOptions = {}
) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async (params: any) => {
    setExporting(true);
    try {
      const blob = await exportFn(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const suggestedFileName = options.fileName || "export.xlsx";
      link.setAttribute("download", suggestedFileName);
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      options.onSuccess?.();
    } catch (err: any) {
      console.error("Export failed:", err);
      if (options.onError) {
        options.onError(err);
      } else {
        window.alert("Failed to export. Please try again.");
      }
    } finally {
      setExporting(false);
    }
  }, [exportFn, options]);

  return {
    exporting,
    handleExport,
  };
}
