import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MapPin, Building, Flag, ChevronRight, ChevronDown } from "lucide-react";
import { useMasterData, GeographicNode } from "@/contexts/MasterDataContext";
import { apiClient } from "@/services/api";

export function GeographyTab() {
  const { geographicNodes, setGeographicNodes } = useMasterData();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] = useState<"Zone" | "State" | "Branch">("Zone");

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleAdd = async () => {
    try {
      const payload = {
        name: newNodeName,
        node_type: newNodeType,
        parent: parentNodeId
      };
      
      const res = await apiClient.post('/geography/', payload);
      if (res.id) {
        // Refresh tree
        const treeRes = await apiClient.get('/geography/tree/');
        setGeographicNodes(treeRes);
        setIsAdding(false);
        setNewNodeName("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/geography/${id}/`);
      const treeRes = await apiClient.get('/geography/tree/');
      setGeographicNodes(treeRes);
    } catch (err) {
      console.error(err);
    }
  };

  const renderNodeIcon = (type: string) => {
    switch (type) {
      case "Zone": return <Flag className="w-4 h-4 text-primary" />;
      case "State": return <MapPin className="w-4 h-4 text-blue-500" />;
      case "Branch": return <Building className="w-4 h-4 text-green-500" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const renderTree = (nodes: GeographicNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      
      return (
        <div key={node.id} className="w-full">
          <div 
            className="flex items-center justify-between p-3 rounded-xl border border-glass border-b-glass/50 bg-glass-dark hover:bg-glass transition-colors mb-2"
            style={{ marginLeft: `${level * 24}px` }}
          >
            <div className="flex items-center gap-3">
              <button 
                onClick={() => hasChildren && toggleNode(node.id)}
                className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 ${!hasChildren && 'invisible'}`}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {renderNodeIcon(node.node_type)}
              <div className="flex flex-col">
                <span className="font-medium text-white">{node.name}</span>
                <span className="text-xs text-muted-foreground">{node.node_type}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setParentNodeId(node.id);
                  setNewNodeType(node.node_type === "Zone" ? "State" : "Branch");
                  setIsAdding(true);
                  if (!isExpanded) toggleNode(node.id);
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Child
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => handleDelete(node.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {isExpanded && hasChildren && (
            <div className="w-full">
              {renderTree(node.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-white">Geographical Hierarchy</h3>
          <p className="text-sm text-muted-foreground">Manage Zones, States, and Branches for organizational structure.</p>
        </div>
        <Button onClick={() => {
          setParentNodeId(null);
          setNewNodeType("Zone");
          setIsAdding(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Root Node
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-glass-dark border-glass shadow-glass">
          <CardHeader>
            <CardTitle className="text-lg">Add New {newNodeType}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={newNodeName} 
                  onChange={(e) => setNewNodeName(e.target.value)} 
                  placeholder="e.g. West Zone" 
                  className="bg-black/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newNodeType} onValueChange={(val: any) => setNewNodeType(val)}>
                  <SelectTrigger className="bg-black/20">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zone">Zone</SelectItem>
                    <SelectItem value="State">State</SelectItem>
                    <SelectItem value="Branch">Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Save Node</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-black/20 p-4 rounded-xl border border-glass/50">
        {geographicNodes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No geographical nodes created yet. Click "Add Root Node" to begin.
          </div>
        ) : (
          renderTree(geographicNodes)
        )}
      </div>
    </div>
  );
}
