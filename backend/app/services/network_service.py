import networkx as nx
from typing import List, Dict, Any

class NetworkService:
    def analyze_graph(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]], layout_type: str = 'force') -> Dict[str, Any]:
        G = nx.DiGraph()
        
        for node in nodes:
            G.add_node(node['id'], label=node.get('label'), **node.get('data', {}))
        for edge in edges:
            G.add_edge(edge['source'], edge['target'], **edge.get('data', {}))
            
        if not G.nodes:
            return {"nodes": [], "edges": []}
            
        in_degrees = dict(G.in_degree())
        out_degrees = dict(G.out_degree())
        
        degree_centrality = nx.degree_centrality(G)
        
        # Optimization: Only run expensive algorithms on top 100 degree nodes
        top_nodes = sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:100]
        top_node_ids = [n[0] for n in top_nodes]
        TopG = G.subgraph(top_node_ids)
        
        try:
            pagerank = nx.pagerank(TopG, alpha=0.85)
        except:
            pagerank = {}
            
        try:
            betweenness = nx.betweenness_centrality(TopG)
        except:
            betweenness = {}
            
        import networkx.algorithms.community as nx_comm
        try:
            communities = nx_comm.greedy_modularity_communities(G.to_undirected())
        except:
            communities = []
            
        community_map = {}
        for c_idx, comm in enumerate(communities):
            for n in comm:
                community_map[n] = c_idx
        
        # Valid Kingpin types
        KINGPIN_TYPES = {'PHONE_NUMBER', 'UPI_ID', 'BANK_ACCOUNT', 'TELEGRAM_USERNAME', 'CRYPTO_WALLET', 'WEBSITE', 'SCAM_WEBSITE'}
        
        # Create an optimized graph to compute layouts
        OptG = nx.DiGraph()
        
        optimized_nodes = []
        optimized_edges = []
        
        components = list(nx.weakly_connected_components(G))
        
        for i, comp in enumerate(components):
            sub_G = G.subgraph(comp)
            
            # Find Kingpin for this component
            best_node = None
            max_score = -1
            
            for n in sub_G.nodes():
                node_type = str(G.nodes[n].get('type', '')).upper()
                label = str(G.nodes[n].get('label', '')).upper()
                is_victim = node_type == 'VICTIM' or label == 'VICTIM'
                
                # Exclude victims and unknown types from being Kingpins
                if is_victim or node_type not in KINGPIN_TYPES:
                    continue
                    
                # Combine degree and pagerank for score
                score = (in_degrees[n] + out_degrees[n]) * 0.5 + pagerank.get(n, 0) * 100
                if score > max_score and (in_degrees[n] + out_degrees[n]) > 0: # Must have at least 1 connection
                    max_score = score
                    best_node = n
                    
            victim_nodes = [n for n in sub_G.nodes() if str(G.nodes[n].get('type', '')).upper() == 'VICTIM' or str(G.nodes[n].get('label', '')).upper() == 'VICTIM']
            cluster_id = f"cluster-{i}-victims"
            has_victim_cluster = len(victim_nodes) > 1
            
            if has_victim_cluster:
                node_data = {
                    "id": cluster_id,
                    "label": "VICTIM_CLUSTER",
                    "type": "CLUSTER",
                    "count": len(victim_nodes),
                    "is_kingpin": False,
                    "in_degree": sum(in_degrees[v] for v in victim_nodes),
                    "out_degree": sum(out_degrees[v] for v in victim_nodes),
                    "hidden_nodes": [dict(G.nodes[n], id=n) for n in victim_nodes],
                    "hidden_edges": [{"source": u, "target": v} for u, v in sub_G.edges() if u in victim_nodes or v in victim_nodes]
                }
                optimized_nodes.append(node_data)
                OptG.add_node(cluster_id, **node_data)
                
                for u, v in sub_G.edges():
                    u_is_vic = u in victim_nodes
                    v_is_vic = v in victim_nodes
                    new_u = cluster_id if u_is_vic else u
                    new_v = cluster_id if v_is_vic else v
                    
                    if new_u != new_v:
                        optimized_edges.append({"source": new_u, "target": new_v})
                        OptG.add_edge(new_u, new_v)
                        
                for n in sub_G.nodes():
                    if n not in victim_nodes:
                        node_data = dict(G.nodes[n])
                        node_data.update({
                            "id": n,
                            "in_degree": in_degrees[n],
                            "out_degree": out_degrees[n],
                            "pagerank": pagerank.get(n, 0),
                            "betweenness": betweenness.get(n, 0),
                            "community": community_map.get(n, 0),
                            "is_kingpin": (n == best_node)
                        })
                        optimized_nodes.append(node_data)
                        OptG.add_node(n, **node_data)
            else:
                for n in sub_G.nodes():
                    node_data = dict(G.nodes[n])
                    node_data.update({
                        "id": n,
                        "in_degree": in_degrees[n],
                        "out_degree": out_degrees[n],
                        "pagerank": pagerank.get(n, 0),
                        "betweenness": betweenness.get(n, 0),
                        "community": community_map.get(n, 0),
                        "is_kingpin": (n == best_node)
                    })
                    optimized_nodes.append(node_data)
                    OptG.add_node(n, **node_data)
                    
                for u, v in sub_G.edges():
                    optimized_edges.append({"source": u, "target": v})
                    OptG.add_edge(u, v)

        # Generate Layout
        positions = {}
        if layout_type == 'hierarchical':
            try:
                positions = nx.multipartite_layout(OptG) # Approximation for DAGs
            except:
                positions = nx.spring_layout(OptG, k=0.5, iterations=50)
        elif layout_type == 'circular':
            positions = nx.circular_layout(OptG)
        elif layout_type == 'radial':
            try:
                # Find root (kingpin)
                roots = [n for n, d in OptG.nodes(data=True) if d.get('is_kingpin')]
                root = roots[0] if roots else list(OptG.nodes())[0]
                positions = nx.bfs_layout(OptG, root)
            except:
                positions = nx.spring_layout(OptG, k=0.5, iterations=50)
        else: # Force Layout
            positions = nx.spring_layout(OptG, k=0.5, iterations=50)
            
        # Scale positions to React Flow canvas size (e.g., 800x600)
        if positions:
            min_x = min(p[0] for p in positions.values())
            max_x = max(p[0] for p in positions.values())
            min_y = min(p[1] for p in positions.values())
            max_y = max(p[1] for p in positions.values())
            
            w = max_x - min_x if max_x > min_x else 1
            h = max_y - min_y if max_y > min_y else 1
            
            for n_id, pos in positions.items():
                positions[n_id] = {
                    "x": ((pos[0] - min_x) / w) * 1000,
                    "y": ((pos[1] - min_y) / h) * 800
                }

        unique_edges = {}
        for e in optimized_edges:
            key = (e['source'], e['target'])
            # Don't overwrite if multiple edges exist between same nodes, just keep one (or sum weights if we want)
            if key not in unique_edges:
                unique_edges[key] = e
                
        # Attach positions to nodes
        for node in optimized_nodes:
            if node['id'] in positions:
                node['position'] = positions[node['id']]
            else:
                node['position'] = {"x": 400, "y": 300}
            
        return {
            "nodes": optimized_nodes,
            "edges": list(unique_edges.values())
        }

network_service = NetworkService()
