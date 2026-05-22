import torch
import torch.nn.functional as F

def sample_curriculum_negatives(pos_edge_index: torch.Tensor,
                                num_drugs: int,
                                num_diseases: int,
                                epoch: int,
                                drug_emb: torch.Tensor = None,
                                disease_emb: torch.Tensor = None,
                                top_k: int = 15) -> torch.Tensor:
    """
    Curriculum Hard Negative Sampler.
    - Epochs < 20: Random negative sampling.
    - Epochs >= 20: Semantic hard negative mining using embedding cosine similarity.
    - Uses a top-K selection candidate pool.

    Args:
        pos_edge_index: [2, E] positive association edges (drug, disease)
        num_drugs: Total number of drugs
        num_diseases: Total number of diseases
        epoch: Current training epoch
        drug_emb: Current drug embeddings [num_drugs, d_model]
        disease_emb: Current disease embeddings [num_diseases, d_model]
        top_k: Size of the candidate pool (default 15)

    Returns:
        neg_edge_index: [2, E] generated negative edges
    """
    device = pos_edge_index.device
    num_edges = pos_edge_index.size(1)

    # Epoch < 20 or embeddings not available -> Random Negative Sampling
    if epoch < 20 or drug_emb is None or disease_emb is None:
        neg_src = torch.randint(0, num_drugs, (num_edges,), device=device)
        neg_dst = torch.randint(0, num_diseases, (num_edges,), device=device)
        return torch.stack([neg_src, neg_dst], dim=0)

    # Epoch >= 20: Semantic hard negative mining
    # 1. Create adjacency mask to exclude positive edges from selection
    adj_mask = torch.zeros((num_drugs, num_diseases), dtype=torch.bool, device=device)
    adj_mask[pos_edge_index[0], pos_edge_index[1]] = True

    # 2. Compute cosine similarity matrix between drugs and diseases
    drug_norm = F.normalize(drug_emb, p=2, dim=-1)
    disease_norm = F.normalize(disease_emb, p=2, dim=-1)
    sim_matrix = torch.matmul(drug_norm, disease_norm.T)  # [num_drugs, num_diseases]

    # 3. Mask out positive associations with a large negative value
    sim_matrix = sim_matrix.masked_fill(adj_mask, -1e9)

    neg_drugs = []
    neg_diseases = []

    # 50/50 split: Keep drug and sample hard disease, vs Keep disease and sample hard drug
    half = num_edges // 2

    # Path A: Keep drug, sample hard disease
    drugs_part_a = pos_edge_index[0, :half]
    # top_indices shape: [half, top_k]
    _, top_indices_diseases = torch.topk(sim_matrix[drugs_part_a], k=top_k, dim=-1)
    
    # Randomly select 1 from the top-K candidate pool for each sample
    random_idx_a = torch.randint(0, top_k, (half,), device=device)
    sampled_diseases = top_indices_diseases[torch.arange(half, device=device), random_idx_a]
    
    neg_drugs.append(drugs_part_a)
    neg_diseases.append(sampled_diseases)

    # Path B: Keep disease, sample hard drug
    diseases_part_b = pos_edge_index[1, half:]
    # top_indices_drugs shape: [num_edges - half, top_k]
    _, top_indices_drugs = torch.topk(sim_matrix.T[diseases_part_b], k=top_k, dim=-1)
    
    random_idx_b = torch.randint(0, top_k, (num_edges - half,), device=device)
    sampled_drugs = top_indices_drugs[torch.arange(num_edges - half, device=device), random_idx_b]

    neg_drugs.append(sampled_drugs)
    neg_diseases.append(diseases_part_b)

    neg_edge_index = torch.stack([
        torch.cat(neg_drugs),
        torch.cat(neg_diseases)
    ], dim=0)

    return neg_edge_index
