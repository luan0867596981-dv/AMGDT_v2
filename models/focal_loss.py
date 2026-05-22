import torch
import torch.nn as nn
import torch.nn.functional as F

class FocalLoss(nn.Module):
    """
    Binary Focal Loss for handling class imbalance.
    FL(p_t) = -alpha * (1 - p_t)^gamma * log(p_t)
    """
    def __init__(self, alpha: float = 0.25, gamma: float = 2.0, reduction: str = 'mean'):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction

    def forward(self, inputs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        Args:
            inputs: Probabilities of class 1, shape (N,)
            targets: Binary labels (0 or 1), shape (N,)
        """
        inputs = inputs.view(-1)
        targets = targets.view(-1).float()
        
        # Bounded clamp to prevent numerical instability with log
        eps = 1e-7
        inputs = torch.clamp(inputs, eps, 1.0 - eps)
        
        # Calculate positive and negative term loss
        loss_pos = -self.alpha * ((1.0 - inputs) ** self.gamma) * torch.log(inputs) * targets
        loss_neg = -(1.0 - self.alpha) * (inputs ** self.gamma) * torch.log(1.0 - inputs) * (1.0 - targets)
        
        loss = loss_pos + loss_neg
        
        if self.reduction == 'mean':
            return loss.mean()
        elif self.reduction == 'sum':
            return loss.sum()
        else:
            return loss
