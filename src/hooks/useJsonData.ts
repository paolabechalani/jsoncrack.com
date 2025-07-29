import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

interface JsonData {
  title: string;
  description: string;
  items: Array<{
    id: number;
    name: string;
    value: string;
  }>;
  metadata: {
    version: string;
    lastModified: string;
  };
}

interface UseJsonDataReturn {
  data: JsonData | null;
  originalData: JsonData | null;
  isEditing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  startEdit: () => void;
  cancelEdit: () => void;
  saveChanges: () => Promise<void>;
  updateData: (newData: JsonData) => void;
  refreshData: () => Promise<void>;
}

export const useJsonData = (): UseJsonDataReturn => {
  const [data, setData] = useState<JsonData | null>(null);
  const [originalData, setOriginalData] = useState<JsonData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if there are changes
  const hasChanges =
    originalData && data ? JSON.stringify(data) !== JSON.stringify(originalData) : false;

  // Fetch data from localStorage (since API routes are disabled in static export)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if we're on the client side
      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }
      
      // Try to get data from localStorage first
      const storedData = localStorage.getItem("editable-json-data");
      let jsonData;
      
      if (storedData) {
        jsonData = JSON.parse(storedData);
      } else {
        // Use default data if nothing in localStorage
        jsonData = {
          title: "Sample JSON Data",
          description: "This is editable content that you can modify using the edit button",
          items: [
            { id: 1, name: "Product A", value: "Electronics" },
            { id: 2, name: "Product B", value: "Clothing" },
            { id: 3, name: "Product C", value: "Books" }
          ],
          metadata: {
            version: "1.0.0",
            lastModified: new Date().toISOString()
          }
        };
        // Save default data to localStorage
        localStorage.setItem("editable-json-data", JSON.stringify(jsonData));
      }
      
      setData(jsonData);
      setOriginalData(jsonData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start editing
  const startEdit = useCallback(() => {
    if (data) {
      setOriginalData(JSON.parse(JSON.stringify(data))); // Deep copy
      setIsEditing(true);
    }
  }, [data]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    if (originalData) {
      setData(JSON.parse(JSON.stringify(originalData))); // Restore original
      setIsEditing(false);
    }
  }, [originalData]);

  // Save changes to localStorage
  const saveChanges = useCallback(async () => {
    if (!data || typeof window === "undefined") return;

    setIsSaving(true);
    try {
      // Update metadata
      const updatedData = {
        ...data,
        metadata: {
          ...data.metadata,
          lastModified: new Date().toISOString()
        }
      };
      
      // Save to localStorage
      localStorage.setItem("editable-json-data", JSON.stringify(updatedData));
      
      setData(updatedData);
      setOriginalData(updatedData);
      setIsEditing(false);
      toast.success("Changes saved successfully!");
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [data]);

  // Update data
  const updateData = useCallback((newData: JsonData) => {
    setData(newData);
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    await fetchData();
    setIsEditing(false);
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    originalData,
    isEditing,
    isLoading,
    isSaving,
    hasChanges,
    startEdit,
    cancelEdit,
    saveChanges,
    updateData,
    refreshData,
  };
};
