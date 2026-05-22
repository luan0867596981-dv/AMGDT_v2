import torch
import torch.nn as nn
import torch.nn.functional as F

class AttentionFusion(nn.Module):
    """
    Enhanced Lightweight Attention Fusion Module with independent gates
    for struct_emb (representation from Graph/Transformer backbone) and
    sim_emb (similarity-based representations), followed by residual refinement.
    """
    def __init__(self, embed_dim, num_heads=1):
        super().__init__()
        self.embed_dim = embed_dim
        # Independent gates for structure and similarity embeddings
        self.gate_struct = nn.Linear(embed_dim * 2, embed_dim)
        self.gate_sim = nn.Linear(embed_dim * 2, embed_dim)
        self.layer_norm = nn.LayerNorm(embed_dim)

    def forward(self, struct_emb, sim_emb=None):
        if sim_emb is None:
            return self.layer_norm(struct_emb)
            
        # Concatenate embeddings to learn attention weight vectors (gates)
        concat_emb = torch.cat([struct_emb, sim_emb], dim=-1)
        
        gate_struct = torch.sigmoid(self.gate_struct(concat_emb))
        gate_sim = torch.sigmoid(self.gate_sim(concat_emb))
        
        # Adaptive gated weighting
        fused = gate_struct * struct_emb + gate_sim * sim_emb
        
        # Residual fusion refinement
        out = self.layer_norm(fused + struct_emb) 
        
        return out
