import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Textarea, Group } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useFile from "../../../store/useFile";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const setContents = useFile(state => state.setContents);
  const getContents = useFile(state => state.getContents);
  const setGraph = useGraph(state => state.setGraph);
  const setSelectedNode = useGraph(state => state.setSelectedNode);
  const nodes = useGraph(state => state.nodes);
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");
  const [localNodeData, setLocalNodeData] = React.useState<NodeData | null>(null);
  
  React.useEffect(() => {
    if (opened) {
      setIsEditing(false);
      setLocalNodeData(nodeData);
      setEditValue(normalizeNodeData(nodeData?.text ?? []));
    }
  }, [opened, nodeData]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(normalizeNodeData(nodeData?.text ?? []));
  };

  const handleSave = () => {
    try {
      // Parse the edited value to ensure it's valid JSON
      const parsedValue = JSON.parse(editValue);
      
      // Get current file contents
      const currentContents = getContents();
      const currentData = JSON.parse(currentContents);
      
      // Update the value at the specified path
      if (nodeData?.path && nodeData.path.length > 0) {
        let target = currentData;
        for (let i = 0; i < nodeData.path.length - 1; i++) {
          target = target[nodeData.path[i]];
        }
        target[nodeData.path[nodeData.path.length - 1]] = parsedValue;
      } else {
        // If no path, replace the entire content
        setContents({ contents: JSON.stringify(parsedValue, null, 2) });
        setIsEditing(false);
        return;
      }
      
      // Update the file contents
      const updatedContents = JSON.stringify(currentData, null, 2);
      setContents({ contents: updatedContents });
      
      // Immediately update the graph with new data
      setGraph(updatedContents);
      
      // Find and update the selected node with new data
      setTimeout(() => {
        const updatedNodes = useGraph.getState().nodes;
        const updatedNode = updatedNodes.find(n => 
          JSON.stringify(n.path) === JSON.stringify(nodeData?.path)
        );
        
        if (updatedNode) {
          setSelectedNode(updatedNode);
          setLocalNodeData(updatedNode);
          setEditValue(normalizeNodeData(updatedNode.text ?? []));
        }
        setIsEditing(false);
      }, 100);
    } catch (error) {
      // If parsing fails, show an error (you might want to add proper error handling UI)
      console.error("Invalid JSON:", error);
      alert("Invalid JSON format. Please check your input.");
    }
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="flex-start">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex direction="column" gap="xs" align="flex-end">
              <CloseButton onClick={onClose} />
              {isEditing ? (
                <Flex gap="xs">
                  <Button 
                    size="xs" 
                    color="green" 
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                  <Button 
                    size="xs" 
                    variant="default"
                    onClick={handleCancel}
                    styles={{
                      root: {
                        color: 'white',
                        backgroundColor: '#4a4a4a',
                        '&:hover': {
                          backgroundColor: '#5a5a5a',
                        },
                      },
                    }}
                  >
                    Cancel
                  </Button>
                </Flex>
              ) : (
                <Button size="xs" variant="light" onClick={handleEdit}>
                  Edit
                </Button>
              )}
            </Flex>
          </Flex>
          {isEditing ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.currentTarget.value)}
              minRows={6}
              maxRows={12}
              autosize
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: "12px",
                },
              }}
            />
          ) : (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(localNodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
          )}
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(localNodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
