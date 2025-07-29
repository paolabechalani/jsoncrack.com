import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

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
  const hasChanges = originalData && data 
    ? JSON.stringify(data) !== JSON.stringify(originalData)
    : false;

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/json-data');
      setData(response.data);
      setOriginalData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
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

  // Save changes
  const saveChanges = useCallback(async () => {
    if (!data) return;

    setIsSaving(true);
    try {
      const response = await axios.post('/api/json-data', { data });
      setData(response.data.data);
      setOriginalData(response.data.data);
      setIsEditing(false);
      toast.success('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Failed to save changes');
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