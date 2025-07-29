import type { ViewPort } from "react-zoomable-ui/dist/ViewPort";
import type { CanvasDirection } from "reaflow/dist/layout/elkLayout";
import { create } from "zustand";
import { SUPPORTED_LIMIT } from "../../../../../constants/graph";
import useJson from "../../../../../store/useJson";
import type { EdgeData, NodeData } from "../../../../../types/graph";
import { parser } from "../lib/jsonParser";
import { getChildrenEdges } from "../lib/utils/getChildrenEdges";
import { getOutgoers } from "../lib/utils/getOutgoers";
import useFile from "../../../../../store/useFile";

export interface Graph {
  viewPort: ViewPort | null;
  direction: CanvasDirection;
  loading: boolean;
  graphCollapsed: boolean;
  fullscreen: boolean;
  collapseAll: boolean;
  nodes: NodeData[];
  edges: EdgeData[];
  collapsedNodes: string[];
  collapsedEdges: string[];
  collapsedParents: string[];
  selectedNode: NodeData | null;
  path: string;
  aboveSupportedLimit: boolean;
}

const initialStates: Graph = {
  viewPort: null,
  direction: "RIGHT",
  loading: true,
  graphCollapsed: false,
  fullscreen: false,
  collapseAll: false,
  nodes: [],
  edges: [],
  collapsedNodes: [],
  collapsedEdges: [],
  collapsedParents: [],
  selectedNode: null,
  path: "",
  aboveSupportedLimit: false,
};

interface GraphActions {
  setGraph: (json?: string, options?: Partial<Graph>[]) => void;
  setLoading: (loading: boolean) => void;
  setDirection: (direction: CanvasDirection) => void;
  setViewPort: (ref: ViewPort) => void;
  setSelectedNode: (nodeData: NodeData) => void;
  focusFirstNode: () => void;
  expandNodes: (nodeId: string) => void;
  expandGraph: () => void;
  collapseNodes: (nodeId: string) => void;
  collapseGraph: () => void;
  getCollapsedNodeIds: () => string[];
  getCollapsedEdgeIds: () => string[];
  toggleFullscreen: (value: boolean) => void;
  toggleCollapseAll: (value: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  centerView: () => void;
  clearGraph: () => void;
  setZoomFactor: (zoomFactor: number) => void;
  updateNode: (path: string, content: any) => void;
}

const useGraph = create<Graph & GraphActions>((set, get) => ({
  ...initialStates,
  toggleCollapseAll: collapseAll => {
    set({ collapseAll });
    get().collapseGraph();
  },
  clearGraph: () => set({ nodes: [], edges: [], loading: false }),
  getCollapsedNodeIds: () => get().collapsedNodes,
  getCollapsedEdgeIds: () => get().collapsedEdges,
  setSelectedNode: nodeData => set({ selectedNode: nodeData }),
  setGraph: (data, options) => {
    const { nodes, edges } = parser(data ?? useJson.getState().json);

    if (get().collapseAll) {
      if (nodes.length > SUPPORTED_LIMIT) {
        return set({ aboveSupportedLimit: true, ...options, loading: false });
      }

      set({ nodes, edges, aboveSupportedLimit: false, ...options });
      get().collapseGraph();
    } else {
      if (nodes.length > SUPPORTED_LIMIT) {
        return set({
          aboveSupportedLimit: true,
          collapsedParents: [],
          collapsedNodes: [],
          collapsedEdges: [],
          ...options,
          loading: false,
        });
      }

      set({
        nodes,
        edges,
        collapsedParents: [],
        collapsedNodes: [],
        collapsedEdges: [],
        graphCollapsed: false,
        aboveSupportedLimit: false,
        ...options,
      });
    }
  },
  setDirection: (direction = "RIGHT") => {
    set({ direction });
    setTimeout(() => get().centerView(), 200);
  },
  updateNode: (path, content) => {
    console.log('updateNode called with path:', path, 'content:', content);
    set(state => {
      if (!state.selectedNode) return {};
      const updatedNodes = state.selectedNode
        ? state.nodes.map(node =>
            node.id === state.selectedNode!.id
              ? { ...node, text: content }
              : node
          )
        : state.nodes;
      
      // Update the graph state
      const newState = {
        nodes: updatedNodes,
        selectedNode: { ...state.selectedNode, text: content }
      };
      
      // After updating the graph, we need to update the left side editor
      setTimeout(() => {
        try {
          console.log('Attempting to update left side editor...');
          // Get the current JSON from useJson store
          const currentJson = useJson.getState().json;
          const parsedJson = JSON.parse(currentJson);
          console.log('Current JSON:', currentJson);
          
          // Parse the path more carefully
          // Path format examples: "{Root}.property", "Root[0].property", "{Root}.array[0].property"
          let pathStr = path.replace(/^{Root}\.?/, '').replace(/^Root\[\d+\]\.?/, '');
          console.log('Parsed path string:', pathStr);
          
          if (!pathStr) {
            // If path is just root, replace the entire content
            const updatedJsonString = JSON.stringify(content, null, 2);
            console.log('Updating entire root with:', updatedJsonString);
            useFile.getState().setContents({ contents: updatedJsonString, hasChanges: true, skipUpdate: false });
            return;
          }
          
          // Split path by dots, but handle array indices
          const pathParts = [];
          let currentPart = '';
          let bracketDepth = 0;
          
          for (let i = 0; i < pathStr.length; i++) {
            const char = pathStr[i];
            if (char === '[') {
              bracketDepth++;
              currentPart += char;
            } else if (char === ']') {
              bracketDepth--;
              currentPart += char;
            } else if (char === '.' && bracketDepth === 0) {
              if (currentPart) pathParts.push(currentPart);
              currentPart = '';
            } else {
              currentPart += char;
            }
          }
          if (currentPart) pathParts.push(currentPart);
          
          console.log('Path parts:', pathParts);
          
          // Navigate to the target location
          let target = parsedJson;
          let parent = null;
          let finalKey = null;
          
          for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            parent = target;
            
            // Handle array access like "property[0]"
            if (part.includes('[') && part.includes(']')) {
              const propName = part.substring(0, part.indexOf('['));
              const indexMatch = part.match(/\[(\d+)\]/);
              
              if (propName) {
                target = target[propName];
                parent = target;
              }
              
              if (indexMatch && i < pathParts.length - 1) {
                const index = parseInt(indexMatch[1]);
                target = target[index];
                finalKey = index;
              } else if (indexMatch && i === pathParts.length - 1) {
                finalKey = parseInt(indexMatch[1]);
              }
            } else {
              if (i === pathParts.length - 1) {
                finalKey = part;
              } else {
                target = target[part];
              }
            }
          }
          
          console.log('Final key:', finalKey, 'Parent:', parent);
          
          // Update the target
          if (parent && finalKey !== null) {
            parent[finalKey] = content;
            console.log('Updated parent[finalKey] with content');
          } else {
            // Fallback: replace entire JSON
            const updatedJsonString = JSON.stringify(content, null, 2);
            console.log('Fallback: replacing entire JSON with:', updatedJsonString);
            useFile.getState().setContents({ contents: updatedJsonString, hasChanges: true, skipUpdate: false });
            return;
          }
          
          // Update the file contents
          const updatedJsonString = JSON.stringify(parsedJson, null, 2);
          console.log('Final updated JSON:', updatedJsonString);
          useFile.getState().setContents({ contents: updatedJsonString, hasChanges: true, skipUpdate: false });
        } catch (error) {
          console.error('Failed to update left side editor:', error);
          // Fallback: just update with the content as-is
          try {
            const updatedJsonString = JSON.stringify(content, null, 2);
            useFile.getState().setContents({ contents: updatedJsonString, hasChanges: true, skipUpdate: false });
          } catch (e) {
            console.error('Fallback update also failed:', e);
          }
        }
      }, 0);
      
      return newState;
    });
  },

  
  setLoading: loading => set({ loading }),
  expandNodes: nodeId => {
    const [childrenNodes, matchingNodes] = getOutgoers(
      nodeId,
      get().nodes,
      get().edges,
      get().collapsedParents
    );
    const childrenEdges = getChildrenEdges(childrenNodes, get().edges);

    const nodesConnectedToParent = childrenEdges.reduce((nodes: string[], edge) => {
      edge.from && !nodes.includes(edge.from) && nodes.push(edge.from);
      edge.to && !nodes.includes(edge.to) && nodes.push(edge.to);
      return nodes;
    }, []);
    const matchingNodesConnectedToParent = matchingNodes.filter(node =>
      nodesConnectedToParent.includes(node)
    );
    const nodeIds = childrenNodes.map(node => node.id).concat(matchingNodesConnectedToParent);
    const edgeIds = childrenEdges.map(edge => edge.id);

    const collapsedParents = get().collapsedParents.filter(cp => cp !== nodeId);
    const collapsedNodes = get().collapsedNodes.filter(nodeId => !nodeIds.includes(nodeId));
    const collapsedEdges = get().collapsedEdges.filter(edgeId => !edgeIds.includes(edgeId));

    set({
      collapsedParents,
      collapsedNodes,
      collapsedEdges,
      graphCollapsed: !!collapsedNodes.length,
    });
  },
  collapseNodes: nodeId => {
    const [childrenNodes] = getOutgoers(nodeId, get().nodes, get().edges);
    const childrenEdges = getChildrenEdges(childrenNodes, get().edges);

    const nodeIds = childrenNodes.map(node => node.id);
    const edgeIds = childrenEdges.map(edge => edge.id);

    set({
      collapsedParents: get().collapsedParents.concat(nodeId),
      collapsedNodes: get().collapsedNodes.concat(nodeIds),
      collapsedEdges: get().collapsedEdges.concat(edgeIds),
      graphCollapsed: !!get().collapsedNodes.concat(nodeIds).length,
    });
  },
  collapseGraph: () => {
    const edges = get().edges;
    const tos = edges.map(edge => edge.to);
    const froms = edges.map(edge => edge.from);
    const parentNodesIds = froms.filter(id => !tos.includes(id));
    const secondDegreeNodesIds = edges
      .filter(edge => parentNodesIds.includes(edge.from))
      .map(edge => edge.to);

    const collapsedParents = get()
      .nodes.filter(node => !parentNodesIds.includes(node.id) && node.data?.isParent)
      .map(node => node.id);

    const collapsedNodes = get()
      .nodes.filter(
        node => !parentNodesIds.includes(node.id) && !secondDegreeNodesIds.includes(node.id)
      )
      .map(node => node.id);

    const closestParentToRoot = Math.min(...collapsedParents.map(n => +n));
    const focusNodeId = `g[id*='node-${closestParentToRoot}']`;
    const rootNode = document.querySelector(focusNodeId);

    set({
      collapsedParents,
      collapsedNodes,
      collapsedEdges: get()
        .edges.filter(edge => !parentNodesIds.includes(edge.from))
        .map(edge => edge.id),
      graphCollapsed: true,
    });

    if (rootNode) {
      get().viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
        elementExtraMarginForZoom: 300,
      });
    }
  },
  expandGraph: () => {
    set({
      collapsedNodes: [],
      collapsedEdges: [],
      collapsedParents: [],
      graphCollapsed: false,
    });
  },
  focusFirstNode: () => {
    const rootNode = document.querySelector("g[id*='node-1']");
    get().viewPort?.camera?.centerFitElementIntoView(rootNode as HTMLElement, {
      elementExtraMarginForZoom: 100,
    });
  },
  setZoomFactor: zoomFactor => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, zoomFactor);
  },
  zoomIn: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, viewPort.zoomFactor + 0.1);
  },
  zoomOut: () => {
    const viewPort = get().viewPort;
    viewPort?.camera?.recenter(viewPort.centerX, viewPort.centerY, viewPort.zoomFactor - 0.1);
  },
  centerView: () => {
    const viewPort = get().viewPort;
    viewPort?.updateContainerSize();

    const canvas = document.querySelector(".jsoncrack-canvas") as HTMLElement | null;
    if (canvas) {
      viewPort?.camera?.centerFitElementIntoView(canvas);
    }
  },
  toggleFullscreen: fullscreen => set({ fullscreen }),
  setViewPort: viewPort => set({ viewPort }),
}));

export default useGraph;
