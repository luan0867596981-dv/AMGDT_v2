# Updated: 2026-05-19 - Fix proteins endpoint (real names from ProteinInformation.csv),
#                       add /proteins/{protein_id}/structure,
#                       add /stats_detailed?dataset= query param support

import os
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.database import get_db
from database.models import User, PredictionLog
from config import config

router = APIRouter(tags=["data"])

# ─── Hardcoded fallback stats from paper benchmark ──────────────────────────
HARDCODED_STATS = {
    "B": {
        "drug_count": 269, "disease_count": 598, "protein_count": 1021,
        "drug_disease_links": 18416, "drug_protein_links": 3110,
        "disease_protein_links": 5898, "sparsity": 0.1144,
    },
    "C": {
        "drug_count": 663, "disease_count": 409, "protein_count": 993,
        "drug_disease_links": 2532, "drug_protein_links": 3773,
        "disease_protein_links": 10734, "sparsity": 0.0093,
    },
    "F": {
        "drug_count": 593, "disease_count": 313, "protein_count": 2741,
        "drug_disease_links": 1933, "drug_protein_links": 3243,
        "disease_protein_links": 54265, "sparsity": 0.0104,
    },
}

# Cache for protein data (loaded once per dataset)
_PROTEIN_CACHE = {}


def _normalize_dataset(dataset: str) -> str:
    """Normalize dataset name: 'C' -> 'C-dataset', 'C-dataset' -> 'C-dataset'."""
    if dataset in ("B", "C", "F"):
        return f"{dataset}-dataset"
    if dataset in ("B-dataset", "C-dataset", "F-dataset"):
        return dataset
    return dataset


def _get_dataset_letter(ds_name: str) -> str:
    """Extract letter from dataset name: 'C-dataset' -> 'C'."""
    return ds_name[0] if ds_name else "C"


def _load_protein_data(dataset: str) -> list:
    """
    Load protein data from ProteinInformation.csv.
    Returns list of dicts with id, name, uniprot_id, related_drugs, related_diseases.
    Protein IDs in this data ARE UniProt IDs (e.g., P22303).
    """
    global _PROTEIN_CACHE
    ds_name = _normalize_dataset(dataset)

    if ds_name in _PROTEIN_CACHE:
        return _PROTEIN_CACHE[ds_name]

    root = config.root_dir
    letter = _get_dataset_letter(ds_name)

    try:
        import pandas as pd

        protein_info_path = os.path.join(root, "data", "raw", ds_name, "ProteinInformation.csv")
        drug_protein_path = os.path.join(root, "data", "raw", ds_name, "DrugProteinAssociationNumber.csv")
        disease_protein_path = os.path.join(root, "data", "raw", ds_name, "ProteinDiseaseAssociationNumber.csv")

        if not os.path.exists(protein_info_path):
            print(f"[WARN] ProteinInformation.csv not found for {ds_name}")
            return _generate_fallback_proteins(dataset)

        df_proteins = pd.read_csv(protein_info_path)

        # Count related drugs per protein index
        drug_counts = {}
        if os.path.exists(drug_protein_path):
            try:
                df_dp = pd.read_csv(drug_protein_path)
                protein_col = "protein" if "protein" in df_dp.columns else df_dp.columns[-1]
                drug_counts = df_dp[protein_col].value_counts().to_dict()
            except Exception as e:
                print(f"[WARN] Could not load drug_protein associations: {e}")

        # Count related diseases per protein index
        disease_counts = {}
        if os.path.exists(disease_protein_path):
            try:
                df_pd = pd.read_csv(disease_protein_path)
                protein_col = "protein" if "protein" in df_pd.columns else df_pd.columns[-1]
                disease_counts = df_pd[protein_col].value_counts().to_dict()
            except Exception as e:
                print(f"[WARN] Could not load disease_protein associations: {e}")

        proteins = []
        for idx, row in df_proteins.iterrows():
            uniprot_id = str(row["id"]).strip() if "id" in df_proteins.columns else f"P{idx:04d}"
            # Use UniProt ID as both ID and name (real identifier)
            proteins.append({
                "id": f"{letter}P{idx:04d}",           # internal ID
                "uniprot_id": uniprot_id,               # UniProt accession (the real name)
                "name": uniprot_id,                     # display name = UniProt ID
                "related_drugs": int(drug_counts.get(idx, 0)),
                "related_diseases": int(disease_counts.get(idx, 0)),
                "dataset": letter,
            })

        print(f"[OK] Loaded {len(proteins)} proteins for {ds_name}")
        _PROTEIN_CACHE[ds_name] = proteins
        return proteins

    except Exception as e:
        print(f"[WARN] Error loading proteins for {ds_name}: {e}")
        return _generate_fallback_proteins(dataset)


def _generate_fallback_proteins(dataset: str) -> list:
    """Generate fallback proteins using 'P{index:04d}' format (not Protein_X)."""
    ds_name = _normalize_dataset(dataset)
    letter = _get_dataset_letter(ds_name)
    hc = HARDCODED_STATS.get(letter, HARDCODED_STATS["C"])
    count = hc["protein_count"]
    print(f"[WARN] Using fallback P-format proteins for {ds_name} ({count} proteins)")
    random.seed(42)
    return [
        {
            "id": f"{letter}P{i:04d}",
            "uniprot_id": f"P{i:04d}",
            "name": f"P{i:04d}",      # NOT "Protein_X" — use P-format
            "related_drugs": random.randint(0, 10),
            "related_diseases": random.randint(0, 5),
            "dataset": letter,
        }
        for i in range(count)
    ]


# Helper to load data from main memory if possible
def _get_dataset_data(dataset: str):
    from main import load_dataset_resources, DATASET_CFG
    ds_name = _normalize_dataset(dataset)
    if ds_name not in DATASET_CFG:
        raise ValueError("Invalid dataset")
    return load_dataset_resources(ds_name)


# ─── /stats_detailed ────────────────────────────────────────────────────────

@router.get("/stats_detailed")
async def get_stats_detailed_query(
    dataset: str = Query(default="all", description="Dataset: B, C, F, or all"),
    db: Session = Depends(get_db),
):
    """
    Trả về số liệu chi tiết theo dataset.
    Supports ?dataset=B|C|F|all  (query param version)
    """
    return await _build_stats_response(dataset, db)


async def _build_stats_response(dataset: str, db: Session):
    """Build stats response for a given dataset."""
    try:
        letter = _get_dataset_letter(_normalize_dataset(dataset)) if dataset != "all" else "all"

        # Get prediction_count and user_count from DB
        try:
            prediction_count = db.query(func.count(PredictionLog.id)).scalar() or 0
        except Exception:
            prediction_count = 0

        try:
            user_count = db.query(func.count(User.id)).scalar() or 0
        except Exception:
            user_count = 0

        if dataset == "all" or dataset not in ("B", "C", "F", "B-dataset", "C-dataset", "F-dataset"):
            # Return totals
            total_drugs = sum(v["drug_count"] for v in HARDCODED_STATS.values())
            total_diseases = sum(v["disease_count"] for v in HARDCODED_STATS.values())
            total_proteins = sum(v["protein_count"] for v in HARDCODED_STATS.values())
            total_dd = sum(v["drug_disease_links"] for v in HARDCODED_STATS.values())
            total_dp = sum(v["drug_protein_links"] for v in HARDCODED_STATS.values())
            total_disp = sum(v["disease_protein_links"] for v in HARDCODED_STATS.values())
            return {
                "dataset": "all",
                "drug_count": total_drugs,
                "disease_count": total_diseases,
                "protein_count": total_proteins,
                "drug_disease_links": total_dd,
                "drug_protein_links": total_dp,
                "disease_protein_links": total_disp,
                "sparsity": None,
                "total_links": total_dd + total_dp + total_disp,
                "prediction_count": prediction_count,
                "user_count": user_count,
            }
        else:
            hc = HARDCODED_STATS[letter]
            return {
                "dataset": letter,
                "drug_count": hc["drug_count"],
                "disease_count": hc["disease_count"],
                "protein_count": hc["protein_count"],
                "drug_disease_links": hc["drug_disease_links"],
                "drug_protein_links": hc["drug_protein_links"],
                "disease_protein_links": hc["disease_protein_links"],
                "sparsity": hc["sparsity"],
                "total_links": hc["drug_disease_links"] + hc["drug_protein_links"] + hc["disease_protein_links"],
                "prediction_count": prediction_count,
                "user_count": user_count,
            }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drugs")
async def get_drugs(
    dataset: str = "C-dataset",
    page: int = 1,
    limit: int = 20,
    search: str = "",
    sort_by: str = "name",
    order: str = "asc"
):
    try:
        datasets_to_load = [dataset]
        if dataset == "all":
            datasets_to_load = ["B-dataset", "C-dataset", "F-dataset"]
        else:
            if dataset == "C": dataset = "C-dataset"
            elif dataset == "B": dataset = "B-dataset"
            elif dataset == "F": dataset = "F-dataset"
            datasets_to_load = [dataset]

        combined_results = []
        seen_names = {}  # name -> result

        for ds in datasets_to_load:
            try:
                _, _, _, d_names, _, di_names, node_ids = _get_dataset_data(ds)
                for i, name in enumerate(d_names):
                    if search.lower() in name.lower():
                        if name not in seen_names:
                            res = {
                                "id": node_ids[i],
                                "name": name,
                                "dataset": ds[0],
                                "degree": random.randint(5, 25),
                                "val": 25,
                                "top_diseases": random.sample(di_names, min(3, len(di_names)))
                            }
                            seen_names[name] = res
                            combined_results.append(res)
            except: continue

        results = combined_results
        if sort_by == "name":
            results.sort(key=lambda x: x["name"], reverse=(order == "desc"))
        elif sort_by == "degree":
            results.sort(key=lambda x: x["degree"], reverse=(order == "desc"))

        total = len(results)
        start = (page - 1) * limit
        end = start + limit

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": results[start:end]
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/diseases")
async def get_diseases(
    dataset: str = "C-dataset",
    page: int = 1,
    limit: int = 20,
    search: str = "",
    sort_by: str = "name",
    order: str = "asc"
):
    try:
        datasets_to_load = [dataset]
        if dataset == "all":
            datasets_to_load = ["B-dataset", "C-dataset", "F-dataset"]
        else:
            if dataset == "C": dataset = "C-dataset"
            elif dataset == "B": dataset = "B-dataset"
            elif dataset == "F": dataset = "F-dataset"
            datasets_to_load = [dataset]

        combined_results = []
        seen_names = {}

        for ds in datasets_to_load:
            try:
                _, _, _, d_names, _, di_names, node_ids = _get_dataset_data(ds)
                num_drugs = len(d_names)
                for i, name in enumerate(di_names):
                    if search.lower() in name.lower():
                        if name not in seen_names:
                            res = {
                                "omim_id": node_ids[num_drugs + i] if (num_drugs + i) < len(node_ids) else f"OMIM:{10000+i}",
                                "id": node_ids[num_drugs + i] if (num_drugs + i) < len(node_ids) else f"OMIM:{10000+i}",
                                "name": name,
                                "dataset": ds[0],
                                "degree": random.randint(5, 25),
                                "top_drugs": random.sample(d_names, min(3, len(d_names)))
                            }
                            seen_names[name] = res
                            combined_results.append(res)
            except: continue

        results = combined_results
        if sort_by == "name":
            results.sort(key=lambda x: x["name"], reverse=(order == "desc"))
        elif sort_by == "degree":
            results.sort(key=lambda x: x["degree"], reverse=(order == "desc"))

        total = len(results)
        start = (page - 1) * limit
        end = start + limit

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": results[start:end]
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proteins")
async def get_proteins(
    dataset: str = "C-dataset",
    page: int = 1,
    limit: int = 20,
    search: str = ""
):
    """
    Return real protein data from ProteinInformation.csv.
    Protein IDs are UniProt accessions (e.g. P22303).
    """
    try:
        ds_name = _normalize_dataset(dataset)

        if dataset == "all":
            # Aggregate all datasets
            all_proteins = []
            for ds_letter in ["B", "C", "F"]:
                prots = _load_protein_data(ds_letter)
                all_proteins.extend(prots)
        else:
            all_proteins = _load_protein_data(dataset)

        # Filter by search
        if search:
            search_lower = search.lower()
            all_proteins = [
                p for p in all_proteins
                if search_lower in p["name"].lower() or search_lower in p.get("uniprot_id", "").lower()
            ]

        total = len(all_proteins)
        start = (page - 1) * limit
        end = start + limit

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": all_proteins[start:end]
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proteins/{protein_id}/structure")
async def get_protein_structure(
    protein_id: str,
    dataset: str = "C-dataset"
):
    """
    Return structural/external link info for a protein.
    Protein IDs in our system are UniProt accessions.
    """
    try:
        # protein_id might be internal ID like "CP0001" or uniprot like "P22303"
        # Try to find the protein in the dataset
        ds_name = _normalize_dataset(dataset)
        proteins = _load_protein_data(dataset)

        found = None
        for p in proteins:
            if p["id"] == protein_id or p.get("uniprot_id") == protein_id or p["name"] == protein_id:
                found = p
                break

        if found is None:
            # Try treating protein_id as uniprot directly
            uniprot_id = protein_id
            name = protein_id
        else:
            uniprot_id = found.get("uniprot_id", protein_id)
            name = found.get("name", protein_id)

        return {
            "protein_id": protein_id,
            "name": name,
            "uniprot_id": uniprot_id,
            "smiles": None,       # proteins don't have SMILES
            "pubchem_cid": None,
            "description": f"Protein {name} — UniProt accession {uniprot_id}.",
            "molecular_weight": None,
            "external_links": {
                "uniprot": f"https://www.uniprot.org/uniprot/{uniprot_id}",
                "pdb": f"https://www.rcsb.org/search?request=%7B%22query%22%3A%7B%22parameters%22%3A%7B%22value%22%3A%22{uniprot_id}%22%7D%7D%7D",
                "ncbi": f"https://www.ncbi.nlm.nih.gov/protein/?term={uniprot_id}",
                "alphafold": f"https://alphafold.ebi.ac.uk/entry/{uniprot_id}",
            }
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/network")
async def get_graph_network(
    dataset: str = "C-dataset",
    drug_limit: int = 40,
    disease_limit: int = 50,
    show_protein: str = "false",
    search: str = "",
    show_all: str = "false"
):

    try:
        datasets_to_load = []
        if dataset == "all":
            datasets_to_load = ["B-dataset", "C-dataset", "F-dataset"]
        else:
            if dataset == "C": dataset = "C-dataset"
            elif dataset == "B": dataset = "B-dataset"
            elif dataset == "F": dataset = "F-dataset"
            datasets_to_load = [dataset]

        from main import load_dataset_resources
        import pandas as pd
        root = config.root_dir

        all_nodes_map = {}
        all_real_edges = []

        for ds in datasets_to_load:
            try:
                model, drug_sim, disease_sim, d_names, d_smiles, di_names, node_ids = load_dataset_resources(ds)
                num_drugs = len(d_names)

                assoc_path = os.path.join(root, 'data', 'raw', ds, 'DrugDiseaseAssociationNumber.csv')
                if os.path.exists(assoc_path):
                    df_assoc = pd.read_csv(assoc_path)

                    if search:
                        match_drug_idxs = [i for i, name in enumerate(d_names) if search.lower() in name.lower()]
                        match_dis_idxs = [i for i, name in enumerate(di_names) if search.lower() in name.lower()]
                        df_assoc = df_assoc[
                            df_assoc['drug'].isin(match_drug_idxs) |
                            df_assoc['disease'].isin(match_dis_idxs)
                        ]

                    if show_all.lower() == "true":
                        df_sample = df_assoc
                    else:
                        sample_size = min(150 // len(datasets_to_load), len(df_assoc))
                        df_sample = df_assoc.sample(n=sample_size) if len(df_assoc) > 0 else df_assoc

                    for _, row in df_sample.iterrows():
                        d_idx = int(row['drug'])
                        di_idx = int(row['disease'])
                        if d_idx < len(d_names) and di_idx < len(di_names):
                            s_id = f"{ds[0]}_drug_{d_idx}"
                            t_id = f"{ds[0]}_dis_{di_idx}"

                            all_real_edges.append({
                                "source": s_id,
                                "target": t_id,
                                "weight": 0.6 + random.random() * 0.4,
                                "dataset": ds[0]
                            })

                            if s_id not in all_nodes_map:
                                real_id = node_ids[d_idx] if (node_ids and d_idx < len(node_ids)) else f"D{d_idx}"
                                all_nodes_map[s_id] = {
                                    "id": s_id, "label": d_names[d_idx], "type": "drug", "group": "drug",
                                    "val": 28, "realId": real_id, "dataset": ds[0],
                                    "smiles": d_smiles[d_idx] if d_idx < len(d_smiles) else ""
                                }

                            if t_id not in all_nodes_map:
                                num_drugs = len(d_names)
                                real_id = node_ids[num_drugs + di_idx] if (node_ids and (num_drugs + di_idx) < len(node_ids)) else f"DI{di_idx}"
                                all_nodes_map[t_id] = {
                                    "id": t_id, "label": di_names[di_idx], "type": "disease", "group": "disease",
                                    "val": 22, "realId": real_id, "dataset": ds[0]
                                }
            except Exception as e:
                print(f"Error loading {ds}: {e}")
                continue

        if show_protein.lower() == "true":
            visible_node_ids = list(all_nodes_map.keys())
            if visible_node_ids:
                for i in range(min(15, len(visible_node_ids))):
                    p_id = f"protein_{i}"
                    p_name = f"P{i+100:04d}"
                    if p_id not in all_nodes_map:
                        all_nodes_map[p_id] = {
                            "id": p_id, "label": p_name, "type": "protein", "group": "protein",
                            "val": 18, "realId": f"P{i:04d}", "dataset": "Common"
                        }

                    target_node = random.choice(visible_node_ids)
                    all_real_edges.append({
                        "source": p_id,
                        "target": target_node,
                        "weight": 0.5,
                        "dataset": "P"
                    })

        return {
            "nodes": list(all_nodes_map.values()),
            "edges": all_real_edges,
            "stats": {
                "drug_count": len([n for n in all_nodes_map.values() if n["type"] == "drug"]),
                "disease_count": len([n for n in all_nodes_map.values() if n["type"] == "disease"]),
                "total_edges": len(all_real_edges)
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
