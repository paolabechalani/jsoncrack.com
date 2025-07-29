import React from 'react';
import { Button, Card, Group, Text, TextInput, Textarea, Stack, LoadingOverlay, Badge } from '@mantine/core';
import { IconEdit, IconDeviceFloppy, IconX, IconRefresh } from '@tabler/icons-react';
import styled from 'styled-components';
import { useJsonData } from '../hooks/useJsonData';

const StyledCard = styled(Card)`
  position: relative;
  max-width: 800px;
  margin: 2rem auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const StyledSection = styled.div`
  padding: 2rem;
  background: ${({ theme }) => theme?.BACKGROUND_PRIMARY || '#ffffff'};
  border-radius: 8px;
`;

const ButtonGroup = styled(Group)`
  margin-top: 1rem;
  gap: 0.5rem;
`;

const ItemCard = styled(Card)`
  background: ${({ theme }) => theme?.BACKGROUND_SECONDARY || '#f8f9fa'};
  margin-bottom: 0.5rem;
`;

interface EditableItemProps {
  item: {
    id: number;
    name: string;
    value: string;
  };
  onUpdate: (id: number, field: 'name' | 'value', newValue: string) => void;
  isEditing: boolean;
}

const EditableItem: React.FC<EditableItemProps> = ({ item, onUpdate, isEditing }) => {
  if (!isEditing) {
    return (
      <ItemCard padding="sm">
        <Group justify="space-between">
          <Text size="sm" fw={500}>{item.name}</Text>
          <Text size="sm" c="dimmed">{item.value}</Text>
        </Group>
      </ItemCard>
    );
  }

  return (
    <ItemCard padding="sm">
      <Group grow>
        <TextInput
          size="sm"
          value={item.name}
          onChange={(e) => onUpdate(item.id, 'name', e.target.value)}
          placeholder="Item name"
        />
        <TextInput
          size="sm"
          value={item.value}
          onChange={(e) => onUpdate(item.id, 'value', e.target.value)}
          placeholder="Item value"
        />
      </Group>
    </ItemCard>
  );
};

export const EditableJsonSection: React.FC = () => {
  const {
    data,
    isEditing,
    isLoading,
    isSaving,
    hasChanges,
    startEdit,
    cancelEdit,
    saveChanges,
    updateData,
    refreshData,
  } = useJsonData();

  const handleFieldUpdate = (field: 'title' | 'description', value: string) => {
    if (data) {
      updateData({
        ...data,
        [field]: value,
      });
    }
  };

  const handleItemUpdate = (id: number, field: 'name' | 'value', newValue: string) => {
    if (data) {
      const updatedItems = data.items.map(item =>
        item.id === id ? { ...item, [field]: newValue } : item
      );
      updateData({
        ...data,
        items: updatedItems,
      });
    }
  };

  const addNewItem = () => {
    if (data) {
      const newId = Math.max(...data.items.map(item => item.id)) + 1;
      const newItem = { id: newId, name: `Item ${newId}`, value: `Value ${newId}` };
      updateData({
        ...data,
        items: [...data.items, newItem],
      });
    }
  };

  const removeItem = (id: number) => {
    if (data) {
      updateData({
        ...data,
        items: data.items.filter(item => item.id !== id),
      });
    }
  };

  if (isLoading) {
    return (
      <StyledSection>
        <StyledCard>
          <LoadingOverlay visible />
          <Text ta="center" p="xl">Loading JSON data...</Text>
        </StyledCard>
      </StyledSection>
    );
  }

  if (!data) {
    return (
      <StyledSection>
        <StyledCard>
          <Text ta="center" c="red" p="xl">Failed to load data</Text>
          <Group justify="center">
            <Button leftSection={<IconRefresh size={16} />} onClick={refreshData}>
              Retry
            </Button>
          </Group>
        </StyledCard>
      </StyledSection>
    );
  }

  return (
    <StyledSection>
      <StyledCard>
        <LoadingOverlay visible={isSaving} />
        
        <Group justify="space-between" mb="md">
          <Text size="xl" fw={700}>Editable JSON Content</Text>
          {hasChanges && <Badge color="orange">Unsaved Changes</Badge>}
        </Group>

        <Stack gap="md">
          {isEditing ? (
            <TextInput
              label="Title"
              value={data.title}
              onChange={(e) => handleFieldUpdate('title', e.target.value)}
              size="md"
            />
          ) : (
            <div>
              <Text size="sm" c="dimmed" mb={4}>Title</Text>
              <Text size="lg" fw={600}>{data.title}</Text>
            </div>
          )}

          {isEditing ? (
            <Textarea
              label="Description"
              value={data.description}
              onChange={(e) => handleFieldUpdate('description', e.target.value)}
              minRows={3}
              size="md"
            />
          ) : (
            <div>
              <Text size="sm" c="dimmed" mb={4}>Description</Text>
              <Text>{data.description}</Text>
            </div>
          )}

          <div>
            <Group justify="space-between" align="center" mb="sm">
              <Text size="sm" c="dimmed">Items</Text>
              {isEditing && (
                <Button size="compact-sm" variant="light" onClick={addNewItem}>
                  Add Item
                </Button>
              )}
            </Group>
            
            {data.items.map((item) => (
              <Group key={item.id} align="flex-start">
                <div style={{ flex: 1 }}>
                  <EditableItem
                    item={item}
                    onUpdate={handleItemUpdate}
                    isEditing={isEditing}
                  />
                </div>
                {isEditing && (
                  <Button
                    size="compact-sm"
                    variant="subtle"
                    color="red"
                    onClick={() => removeItem(item.id)}
                    mt="xs"
                  >
                    <IconX size={16} />
                  </Button>
                )}
              </Group>
            ))}
          </div>

          {data.metadata && (
            <div>
              <Text size="sm" c="dimmed" mb={4}>Metadata</Text>
              <Group gap="md">
                <Text size="xs" c="dimmed">Version: {data.metadata.version}</Text>
                <Text size="xs" c="dimmed">
                  Last Modified: {new Date(data.metadata.lastModified).toLocaleString()}
                </Text>
              </Group>
            </div>
          )}
        </Stack>

        <ButtonGroup justify={isEditing ? "space-between" : "flex-start"}>
          {!isEditing ? (
            <Button
              leftSection={<IconEdit size={16} />}
              onClick={startEdit}
              variant="filled"
            >
              Edit
            </Button>
          ) : (
            <>
              <Group>
                <Button
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={saveChanges}
                  loading={isSaving}
                  disabled={!hasChanges}
                  color="green"
                >
                  Save Changes
                </Button>
                <Button
                  leftSection={<IconX size={16} />}
                  onClick={cancelEdit}
                  variant="outline"
                  color="red"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={refreshData}
                variant="subtle"
                disabled={isSaving}
              >
                Refresh
              </Button>
            </>
          )}
        </ButtonGroup>
      </StyledCard>
    </StyledSection>
  );
};