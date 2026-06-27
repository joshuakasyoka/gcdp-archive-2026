function sharedTagCount(tagsA, tagsB) {
  let count = 0;
  for (const key of ['themes', 'design_as', 'methods', 'materials']) {
    const a = tagsA?.[key] || [];
    const b = tagsB?.[key] || [];
    for (const term of a) {
      if (b.includes(term)) count += 1;
    }
  }
  return count;
}

function pickBestGroup(candidates, count) {
  if (candidates.length <= count) return candidates.slice(0, count);

  let bestGroup = candidates.slice(0, count);
  let bestScore = -1;

  if (count === 3) {
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        for (let k = j + 1; k < candidates.length; k++) {
          const group = [candidates[i], candidates[j], candidates[k]];
          const score =
            sharedTagCount(group[0].tags, group[1].tags) +
            sharedTagCount(group[1].tags, group[2].tags) +
            sharedTagCount(group[0].tags, group[2].tags);
          if (score > bestScore) {
            bestScore = score;
            bestGroup = group;
          }
        }
      }
    }
    return bestGroup;
  }

  return bestGroup;
}

export function pickPreviewArtefacts(artefacts) {
  const candidates = artefacts.filter(a => a.file_paths?.[0]);
  const initial = pickBestGroup(candidates, 3);
  const initialIds = new Set(initial.map(a => a.artifact_id));

  let added = candidates.find(c => !initialIds.has(c.artifact_id));
  let bestScore = -1;

  for (const candidate of candidates) {
    if (initialIds.has(candidate.artifact_id)) continue;
    const score = initial.reduce(
      (total, artefact) => total + sharedTagCount(artefact.tags, candidate.tags),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      added = candidate;
    }
  }

  return { initial, added };
}
