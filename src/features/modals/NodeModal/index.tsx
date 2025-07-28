import React, { useState } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Button, Group, Textarea, Alert } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import toast from "react-hot-toast";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

const dataToString = (data: any) => {
  const text = Array.isArray(data) ? Object.fromEntries(data) : data;
  const replacer = (_: string, v: string) => {
    if (typeof v === "string") return v.replaceAll('"', "");
    return v;
  };

  return JSON.stringify(text, replacer, 2);
};

// Helper function to convert node path to JSONPath format
const convertToJSONPath = (nodePath: string): string => {
  if (!nodePath) return "$";

  // Convert the custom path format to JSONPath
  const jsonPath = nodePath
    .replace(/\{Root\}/, "$")
    .replace(/Root\[(\d+)\]/, "$[$1]")
    .replace(/\.([^[\]]+)/g, ".$1")
    .replace(/\[(\d+)\]/g, "[$1]");

  return jsonPath;
};

// Helper function to update JSON at a specific path
const updateJsonAtPath = (json: string, path: string, newValue: any): string => {
  try {
    const parsedJson = JSON.parse(json);
    const jsonPath = convertToJSONPath(path);

    // For root level updates
    if (jsonPath === "$" || path === "{Root}") {
      return JSON.stringify(newValue, null, 2);
    }

    // Use a more direct approach to update the value
    const pathParts = jsonPath
      .replace(/^\$\.?/, "")
      .split(/[\.\[\]]+/)
      .filter(Boolean);

    let current = parsedJson;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];

      if (!isNaN(Number(part))) {
        // Array index
        current = current[Number(part)];
      } else {
        // Object property
        current = current[part];
      }

      if (current === undefined) {
        throw new Error(`Path not found: ${path}`);
      }
    }

    const lastPart = pathParts[pathParts.length - 1];
    if (!isNaN(Number(lastPart))) {
      current[Number(lastPart)] = newValue;
    } else {
      current[lastPart] = newValue;
    }

    return JSON.stringify(parsedJson, null, 2);
  } catch (error) {
    throw new Error(
      `Failed to update JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const nodeData = useGraph(state => dataToString(state.selectedNode?.text));
  const path = useGraph(state => state.selectedNode?.path || "");
  const getJson = useJson(state => state.getJson);
  const setContents = useFile(state => state.setContents);

  React.useEffect(() => {
    setEditValue(nodeData);
    setError(null);
  }, [nodeData, opened]);

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(nodeData);
    setError(null);
  };

  const handleSave = async () => {
    if (!editValue.trim()) {
      setError("Value cannot be empty");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Parse the edited value to validate JSON
      let parsedValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        // If it's not valid JSON, treat it as a string value
        parsedValue = editValue;
      }

      // Update the JSON at the specific path
      const currentJson = getJson();
      const updatedJson = updateJsonAtPath(currentJson, path, parsedValue);

      // Update the file contents
      setContents({ contents: updatedJson });

      setIsEditing(false);
      toast.success("Node updated successfully");
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save changes");
      toast.error("Failed to update node");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Node Content" size="auto" opened={opened} onClose={onClose} centered>
      <Stack py="sm" gap="sm">
        <Stack gap="xs">
          <Text fz="xs" fw={500}>
            Content
          </Text>
          <ScrollArea.Autosize mah={250} maw={600}>
            {isEditing ? (
              <Stack gap="sm">
                <Textarea
                  value={editValue}
                  onChange={event => setEditValue(event.currentTarget.value)}
                  minRows={6}
                  maxRows={12}
                  autosize
                  placeholder="Enter JSON value..."
                  error={error}
                />
                {error && <Alert color="red">{error}</Alert>}
                <Group justify="flex-end">
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} loading={isSaving} disabled={!editValue.trim()}>
                    Save
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Stack gap="sm">
                <CodeHighlight code={nodeData} miw={350} maw={600} language="json" withCopyButton />
                <Group justify="flex-end">
                  <Button onClick={handleEdit} variant="outline">
                    Edit
                  </Button>
                </Group>
              </Stack>
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Stack gap="xs">
          <Text fz="xs" fw={500}>
            JSON Path
          </Text>
          <ScrollArea.Autosize maw={600}>
            <CodeHighlight
              code={path}
              miw={350}
              mah={250}
              language="json"
              copyLabel="Copy to clipboard"
              copiedLabel="Copied to clipboard"
              withCopyButton
            />
          </ScrollArea.Autosize>
        </Stack>
      </Stack>
    </Modal>
  );
};
