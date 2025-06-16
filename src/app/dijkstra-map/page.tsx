
"use client";

import type { NextPage } from 'next';
import { useState, ChangeEvent, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Route, MapIcon, FileTextIcon, CopyIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface Node {
  id: string; 
  x: number;  
  y: number;  
  originalLat: number; 
  originalLon: number; 
}

interface Way {
  nodes: number[]; 
  oneway: boolean;
}

interface AdjNode {
  node: number; 
  weight: number;
}

type AdjacencyList = AdjNode[][];

interface DijkstraResult {
  distance: number;
  path: number[]; 
  visitedNodesCount: number;
  processingTimeMs: number;
}

interface ScalingParams {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  padding: number;
  canvasWidth: number;
  canvasHeight: number;
}

interface SelectedNodeInfo {
  index: number;
  id: string;
  lat: number;
  lon: number;
}

class PriorityQueue {
  items: { element: number; priority: number }[];
  constructor() {
    this.items = [];
  }
  enqueue(element: number, priority: number) {
    this.items.push({ element, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  dequeue() {
    return this.items.shift();
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

const DijkstraMapPage: NextPage = () => {
  const [osmFile, setOsmFile] = useState<File | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [ways, setWays] = useState<Way[]>([]);
  const [adj, setAdj] = useState<AdjacencyList>([]);
  const [selectedNodesInfo, setSelectedNodesInfo] = useState<SelectedNodeInfo[]>([]);
  const [pathResult, setPathResult] = useState<DijkstraResult | null>(null);
  const [pathResultText, setPathResultText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mapStats, setMapStats] = useState<string | null>(null);
  const [scalingParams, setScalingParams] = useState<ScalingParams | null>(null);
  const [dashOffset, setDashOffset] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const animationFrameIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  const distancia = useCallback((a: Node, b: Node): number => {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }, []);

  const buildGraphInternal = useCallback((currentNodes: Node[], currentWays: Way[]) => {
    const newAdj: AdjacencyList = Array.from({ length: currentNodes.length }, () => []);
    for (const way of currentWays) {
      const ndRefs = way.nodes;
      const oneway = way.oneway;
      for (let i = 0; i < ndRefs.length - 1; i++) {
        const uIndex = ndRefs[i];
        const vIndex = ndRefs[i + 1];
        if (uIndex === undefined || vIndex === undefined || uIndex >= currentNodes.length || vIndex >= currentNodes.length) {
          console.warn("Node index out of bounds or undefined in way processing:", way, uIndex, vIndex, currentNodes.length);
          continue;
        }
        const weight = distancia(currentNodes[uIndex], currentNodes[vIndex]);
        newAdj[uIndex].push({ node: vIndex, weight });
        if (!oneway) {
          newAdj[vIndex].push({ node: uIndex, weight });
        }
      }
    }
    setAdj(newAdj);
  }, [distancia]);

  const handleFileUploadAndParse = useCallback(async () => {
    if (!osmFile) {
      setTimeout(() => toast({ title: "Nenhum Arquivo", description: "Por favor, selecione um arquivo .osm primeiro.", variant: "destructive" }), 0);
      return;
    }
    setIsLoading(true);
    setPathResultText(null);
    setPathResult(null);
    setSelectedNodesInfo([]);
    setNodes([]); 
    setWays([]);
    setAdj([]);
    setMapStats(null);
    setScalingParams(null); 

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(event.target?.result as string, "application/xml");
        
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
          console.error("Erro ao parsear XML:", errorNode.textContent);
          setTimeout(() => toast({ title: "Erro de Parsing", description: "Não foi possível parsear o arquivo OSM. Verifique o formato.", variant: "destructive" }), 0);
          setIsLoading(false);
          return;
        }

        const nodeElements = Array.from(xmlDoc.getElementsByTagName('node'));
        const wayElements = Array.from(xmlDoc.getElementsByTagName('way'));
        
        const newNodes: Node[] = [];
        const idToIndex: { [id: string]: number } = {};
        
        for (const nodeEl of nodeElements) {
          const id = nodeEl.getAttribute('id');
          const lat = parseFloat(nodeEl.getAttribute('lat') || '0');
          const lon = parseFloat(nodeEl.getAttribute('lon') || '0');
          if (id) {
            idToIndex[id] = newNodes.length; 
            newNodes.push({ id, x: lon, y: lat, originalLat: lat, originalLon: lon }); 
          }
        }
        
        const newWays: Way[] = [];
        for (const wayEl of wayElements) {
          const nds = Array.from(wayEl.getElementsByTagName('nd'));
          const ndRefs: number[] = [];
          for (const nd of nds) {
            const ref = nd.getAttribute('ref');
            if (ref && idToIndex[ref] !== undefined) {
              ndRefs.push(idToIndex[ref]);
            }
          }

          let oneway = false;
          const tags = Array.from(wayEl.getElementsByTagName('tag'));
          for (const tag of tags) {
            if (tag.getAttribute('k') === 'oneway' && tag.getAttribute('v') === 'yes') {
              oneway = true;
              break;
            }
          }
          if (ndRefs.length > 1) {
            newWays.push({ nodes: ndRefs, oneway });
          }
        }
        
        setNodes(newNodes);
        setWays(newWays);
        buildGraphInternal(newNodes, newWays); 
        
        setMapStats(`Mapa Carregado: ${newNodes.length} Nós, ${newWays.length} Vias`);
        setTimeout(() => toast({ title: "Arquivo Processado", description: "Grafo criado a partir do arquivo OSM." }), 0);
      } catch (error) {
        console.error("Erro ao processar arquivo OSM:", error);
        setTimeout(() => toast({ title: "Erro de Processamento", description: "Ocorreu um erro ao processar o arquivo.", variant: "destructive" }), 0);
        setNodes([]);
        setWays([]);
        setAdj([]);
        setSelectedNodesInfo([]);
        setMapStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setTimeout(() => toast({ title: "Erro de Leitura", description: "Não foi possível ler o arquivo.", variant: "destructive" }), 0);
      setIsLoading(false);
    };
    reader.readAsText(osmFile);
  }, [osmFile, toast, buildGraphInternal]);

  const dijkstraInternal = useCallback((startNodeIndex: number, endNodeIndex: number): DijkstraResult | null => {
    if (nodes.length === 0 || adj.length === 0 || startNodeIndex >= nodes.length || endNodeIndex >= nodes.length) return null;

    const startTime = performance.now();
    const dist = Array(nodes.length).fill(Infinity);
    const prev = Array(nodes.length).fill(null);
    const visited = Array(nodes.length).fill(false); 
    let visitedNodesCount = 0;
    dist[startNodeIndex] = 0;

    const pq = new PriorityQueue();
    pq.enqueue(startNodeIndex, 0);

    while (!pq.isEmpty()) {
      const dequeued = pq.dequeue();
      if (!dequeued) break;
      const { element: u } = dequeued;

      if (visited[u]) continue;
      visited[u] = true;
      visitedNodesCount++;

      if (u === endNodeIndex) break; 
      if (!adj[u]) continue; 

      for (const neighbor of adj[u]) {
        const alt = dist[u] + neighbor.weight;
        if (alt < dist[neighbor.node]) {
          dist[neighbor.node] = alt;
          prev[neighbor.node] = u;
          pq.enqueue(neighbor.node, alt);
        }
      }
    }
    const endTime = performance.now();
    const processingTimeMs = endTime - startTime;

    if (dist[endNodeIndex] === Infinity) return null; 

    const path: number[] = [];
    for (let at: number | null = endNodeIndex; at !== null; at = prev[at]) {
      path.push(at);
    }
    path.reverse();
    return { distance: dist[endNodeIndex], path, visitedNodesCount, processingTimeMs };
  }, [nodes, adj]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) {
      setScalingParams(null);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const padding = 20;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    if (nodes.length > 0) {
      minX = Math.min(...nodes.map(n => n.x)); 
      maxX = Math.max(...nodes.map(n => n.x)); 
      minY = Math.min(...nodes.map(n => n.y)); 
      maxY = Math.max(...nodes.map(n => n.y)); 
    } else {
      minX = 0; maxX = 1; minY = 0; maxY = 1; 
    }
    
    const dX = maxX - minX;
    const dY = maxY - minY;

    const scaleX = (dX === 0) ? 1 : (canvasWidth - 2 * padding) / dX;
    const scaleY = (dY === 0) ? 1 : (canvasHeight - 2 * padding) / dY;
    
    setScalingParams({ 
        minX, maxX, minY, maxY, 
        scaleX, scaleY, 
        offsetX: (dX === 0) ? canvasWidth / 2 : padding - minX * scaleX, 
        offsetY: (dY === 0) ? canvasHeight / 2 : padding - minY * scaleY, 
        padding, canvasWidth, canvasHeight 
    });

  }, [nodes, osmFile]);

  const scalePoint = useCallback((node: Node): { x: number, y: number } => {
    if (!scalingParams) return { x: 0, y: 0 };
    if (scalingParams.maxX === scalingParams.minX && scalingParams.maxY === scalingParams.minY) {
        return { x: scalingParams.canvasWidth / 2, y: scalingParams.canvasHeight / 2 };
    }
    return {
      x: scalingParams.offsetX + node.x * scalingParams.scaleX,
      y: scalingParams.offsetY + node.y * scalingParams.scaleY
    };
  }, [scalingParams]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scalingParams || nodes.length === 0 ) {
      if(canvas) {
        const ctx = canvas.getContext('2d');
        if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#007bff';
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6f42c1'; 
    const accentFgColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-foreground').trim() || '#ffffff'; 

    ctx.strokeStyle = isDarkMode ? 'white' : 'black'; 
    ctx.lineWidth = 1;
    ways.forEach(way => {
      const ndRefs = way.nodes;
      for (let i = 0; i < ndRefs.length - 1; i++) {
        if (nodes[ndRefs[i]] && nodes[ndRefs[i+1]]) {
          const u = scalePoint(nodes[ndRefs[i]]);
          const v = scalePoint(nodes[ndRefs[i + 1]]);
          ctx.beginPath();
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(v.x, v.y);
          ctx.stroke();
        }
      }
    });

    if (pathResult && pathResult.path.length > 0) {
      ctx.strokeStyle = primaryColor; 
      ctx.lineWidth = 4;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 10;
      
      ctx.setLineDash([10, 5]); 
      ctx.lineDashOffset = -dashOffset; 

      ctx.beginPath();
      if (nodes[pathResult.path[0]]) {
        const startPathNode = scalePoint(nodes[pathResult.path[0]]);
        ctx.moveTo(startPathNode.x, startPathNode.y);
        for (let i = 1; i < pathResult.path.length; i++) {
          if (nodes[pathResult.path[i]]) {
            const p = scalePoint(nodes[pathResult.path[i]]);
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0; 
      ctx.setLineDash([]); 
    }
    
    const selectedNodeFillColor = isDarkMode ? accentColor : 'black'; 
    const selectedNodeTextColor = isDarkMode ? accentFgColor : 'white';


    selectedNodesInfo.forEach(nodeInfo => {
      if (nodes[nodeInfo.index]) {
        const p = scalePoint(nodes[nodeInfo.index]);
        ctx.fillStyle = selectedNodeFillColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI); 
        ctx.fill();
        
        ctx.fillStyle = selectedNodeTextColor;
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`ID: ${nodeInfo.id}`, p.x, p.y - 10); 
      }
    });
  }, [nodes, ways, pathResult, selectedNodesInfo, scalingParams, scalePoint, dashOffset]);

  useEffect(() => {
    if (pathResult && pathResult.path.length > 0) {
      const animate = () => {
        setDashOffset(prevOffset => (prevOffset + 0.5) % 15); 
        animationFrameIdRef.current = requestAnimationFrame(animate);
      };
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      setDashOffset(0); 
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [pathResult]);

  const getClosestNodeIndex = useCallback((canvasX: number, canvasY: number): number | null => {
    if (!scalingParams || nodes.length === 0 || !canvasRef.current) return null;
    
    const graphX = (canvasX - scalingParams.offsetX) / scalingParams.scaleX;
    const graphY = (canvasY - scalingParams.offsetY) / scalingParams.scaleY;

    let closestIndex = -1;
    let minSqDist = Infinity; 
    for (let i = 0; i < nodes.length; i++) {
      const dx = graphX - nodes[i].x; 
      const dy = graphY - nodes[i].y; 
      const sqDist = dx * dx + dy * dy;
      if (sqDist < minSqDist) {
        minSqDist = sqDist;
        closestIndex = i;
      }
    }
    
    const pixelThreshold = 15; 
    const minScale = Math.min(Math.abs(scalingParams.scaleX), Math.abs(scalingParams.scaleY));
    if (minScale === 0) return closestIndex !== -1 ? closestIndex : null; 
    
    const thresholdInGraphUnitsSq = (pixelThreshold / minScale) ** 2;
    
    if (closestIndex !== -1 && minSqDist < thresholdInGraphUnitsSq) {
        return closestIndex;
    }
    return null;
  }, [nodes, scalingParams]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0 || !scalingParams) return;

    const handleClick = (event: MouseEvent) => {
      if (isLoading) return; 
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const closestNodeIdx = getClosestNodeIndex(x, y);
      if (closestNodeIdx === null) {
        return;
      }

      const clickedNodeData = nodes[closestNodeIdx];
      const newNodeInfo: SelectedNodeInfo = {
        index: closestNodeIdx,
        id: clickedNodeData.id,
        lat: clickedNodeData.originalLat, 
        lon: clickedNodeData.originalLon
      };

      setSelectedNodesInfo(prevSelected => {
        let newSelected = [...prevSelected];
        const existingNodeIndexInSelection = newSelected.findIndex(n => n.index === closestNodeIdx);

        if (existingNodeIndexInSelection !== -1) { 
            newSelected.splice(existingNodeIndexInSelection, 1); 
            setTimeout(() => toast({ title: "Nó Desselecionado", description: `Nó ${clickedNodeData.id} (Lat: ${clickedNodeData.originalLat.toFixed(5)}, Lon: ${clickedNodeData.originalLon.toFixed(5)}) removido.` }), 0);
        } else {
            if (newSelected.length < 2) {
                 newSelected.push(newNodeInfo);
            } else { 
                 newSelected = [newSelected[1], newNodeInfo]; 
            }
        }
        
        if (newSelected.length < 2) {
            setPathResult(null);
            setPathResultText(null);
        }

        if (newSelected.length === 0) {
        } else if (newSelected.length === 1) {
           setTimeout(() => toast({ title: "Nó de Início Selecionado", description: `${newSelected[0].id} (Lat: ${newSelected[0].lat.toFixed(5)}, Lon: ${newSelected[0].lon.toFixed(5)}). Selecione o destino.` }), 0);
        } else if (newSelected.length === 2) {
          const startNodeIdx = newSelected[0].index;
          const endNodeIdx = newSelected[1].index;
          const result = dijkstraInternal(startNodeIdx, endNodeIdx);
          
          if (!result) {
            setTimeout(() => toast({ variant: "destructive", title: "Caminho não encontrado", description: "Não existe caminho entre os nós selecionados." }), 0);
            setPathResult(null); 
            setPathResultText('Não existe caminho entre os nós selecionados.');
          } else {
            const pathNodeIds = result.path.map(idx => nodes[idx].id).join(' -> ');
            const pathNodeCoords = result.path.map(i => `Nó ${nodes[i].id} (Lon: ${nodes[i].originalLon.toFixed(5)}, Lat: ${nodes[i].originalLat.toFixed(5)})`).join('\n');
            const resultString = 
              `Menor Caminho:\n` +
              `---------------------------------\n` +
              `Origem: Nó ${newSelected[0].id} (Lat: ${newSelected[0].lat.toFixed(5)}, Long: ${newSelected[0].lon.toFixed(5)})\n` +
              `Destino: Nó ${newSelected[1].id} (Lat: ${newSelected[1].lat.toFixed(5)}, Long: ${newSelected[1].lon.toFixed(5)})\n` +
              `---------------------------------\n` +
              `Distância (unidade do grafo): ${result.distance.toFixed(3)}\n` + 
              `Tempo de processamento: ${result.processingTimeMs.toFixed(2)} ms\n` +
              `Nós visitados: ${result.visitedNodesCount}\n` +
              `---------------------------------\n` +
              `Caminho (IDs dos nós):\n${pathNodeIds}\n` +
              `---------------------------------\n` +
              `Coordenadas do Caminho:\n${pathNodeCoords}`;
            
            setPathResultText(resultString);
            setPathResult(result); 
            setTimeout(() => toast({ title: "Caminho Encontrado!", description: `Distância: ${result.distance.toFixed(3)}. Tempo: ${result.processingTimeMs.toFixed(2)} ms.` }), 0);
          }
        }
        return newSelected;
      });
    };

    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [canvasRef, nodes, scalingParams, getClosestNodeIndex, dijkstraInternal, toast, isLoading, adj]); 


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.name.endsWith('.osm')) {
        setOsmFile(file);
        setNodes([]);
        setWays([]);
        setAdj([]);
        setSelectedNodesInfo([]);
        setPathResult(null);
        setPathResultText(null);
        setMapStats("Carregando novo arquivo..."); 
        setScalingParams(null); 
        if(canvasRef.current) { 
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0,0,canvasRef.current.width, canvasRef.current.height);
        }
      } else {
        setTimeout(() => toast({ title: "Erro de Arquivo", description: "Por favor, selecione um arquivo .osm válido.", variant: "destructive" }), 0);
        if (event.target) event.target.value = ''; 
        setOsmFile(null);
      }
    } else {
      setOsmFile(null);
    }
  };

  const handleCopyImage = useCallback(async () => {
    if (!canvasRef.current) {
      setTimeout(() => toast({ title: "Erro", description: "Canvas não encontrado.", variant: "destructive" }), 0);
      return;
    }
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob, 
        }),
      ]);
      setTimeout(() => toast({ title: "Sucesso!", description: "Imagem do grafo copiada para a área de transferência." }), 0);
    } catch (err) {
      console.error('Falha ao copiar imagem:', err);
      setTimeout(() => toast({ title: "Erro ao Copiar", description: "Não foi possível copiar a imagem. Verifique as permissões do navegador.", variant: "destructive" }), 0);
    }
  }, [toast]);


  return (
    <div className="container mx-auto py-8 px-4 flex flex-col items-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-4xl mb-8 bg-card/80 backdrop-blur-md shadow-xl border-border/50">
        <CardHeader className="text-center">
          <MapIcon className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-3xl font-headline text-primary">Mapa Interativo com Dijkstra</CardTitle>
          <CardDescription className="text-muted-foreground">
            Carregue um arquivo .osm, clique nos nós no mapa para definir início/fim e encontre o menor caminho.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="osm-file" className="text-lg font-medium text-foreground">Arquivo .OSM</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              <Input
                id="osm-file"
                ref={fileInputRef}
                type="file"
                accept=".osm"
                onChange={handleFileChange}
                className="flex-grow file:mr-4 file:py-2 h-14 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <Button onClick={handleFileUploadAndParse} disabled={!osmFile || isLoading} className="w-full sm:w-auto h-14">
                <UploadCloud className="mr-2 h-5 w-5" />
                {isLoading ? 'Processando...' : 'Carregar e Processar OSM'}
              </Button>
            </div>
            {osmFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {osmFile.name}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-4xl bg-card/80 backdrop-blur-md shadow-xl border-border/50">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-headline text-primary flex items-center">
                <Route className="mr-2 h-6 w-6"/>
                Visualização do Grafo
              </CardTitle>
              {mapStats && <CardDescription className="text-muted-foreground pt-1">{mapStats}</CardDescription>}
            </div>
            {nodes.length > 0 && ( 
                <Button onClick={handleCopyImage} variant="outline" size="sm" className="ml-auto">
                    <CopyIcon className="mr-2 h-4 w-4" />
                    Copiar Imagem
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-2 sm:p-4">
          <canvas 
            ref={canvasRef} 
            width={700} 
            height={450} 
            className="border border-border/60 rounded-md bg-background/30 shadow-inner" 
          />
          {nodes.length === 0 && !isLoading && <p className="mt-4 text-muted-foreground">Carregue um arquivo OSM para visualizar o mapa interativo.</p>}
          {isLoading && <p className="mt-4 text-muted-foreground">Processando arquivo, aguarde...</p>}
          
          {selectedNodesInfo.length > 0 && (
            <div className="mt-4 w-full text-sm text-muted-foreground space-y-2">
              {selectedNodesInfo.map((node, index) => (
                <p key={node.index}>
                  <strong className="text-foreground">{index === 0 ? "Origem:" : "Destino:"}</strong> Nó {node.id} (Lat: {node.lat.toFixed(5)}, Lon: {node.lon.toFixed(5)})
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {pathResultText && (
        <Card className="w-full max-w-4xl mt-8 bg-card/80 backdrop-blur-md shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary flex items-center">
                <FileTextIcon className="mr-2 h-6 w-6"/>
                Resultado do Caminho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-foreground whitespace-pre-wrap bg-background/50 p-4 rounded-md overflow-x-auto">{pathResultText}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DijkstraMapPage;
    
