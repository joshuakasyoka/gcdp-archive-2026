import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './ArtefactForceGraphPreview.css';

const CARD_W = 68;
const CARD_H = 48;
const IMG_PAD = 2;
const VIEW_ZOOM = 1.25;
const ORBIT_DURATION_MS = 120000;
const CYCLE_MS = 43000;
const ADD_AT_MS = 2000;
const ADD_DURATION_MS = 2800;
const REMOVE_AT_MS = 26000;
const REMOVE_DURATION_MS = 2800;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function layoutOnCircle(count, cx, cy, radius, angleOffset, drift = 0) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2 + angleOffset;
    const r = radius + drift;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
}

function addedProgressForElapsed(elapsed) {
  const cycleTime = elapsed % CYCLE_MS;

  if (cycleTime < ADD_AT_MS) return 0;
  if (cycleTime < ADD_AT_MS + ADD_DURATION_MS) {
    return easeInOutCubic((cycleTime - ADD_AT_MS) / ADD_DURATION_MS);
  }
  if (cycleTime < REMOVE_AT_MS) return 1;
  if (cycleTime < REMOVE_AT_MS + REMOVE_DURATION_MS) {
    return 1 - easeInOutCubic((cycleTime - REMOVE_AT_MS) / REMOVE_DURATION_MS);
  }
  return 0;
}

function appendTile(nodeSelection, imgW, imgH) {
  nodeSelection.append('rect')
    .attr('class', 'force-preview-card')
    .attr('width', CARD_W)
    .attr('height', CARD_H)
    .attr('x', -CARD_W / 2)
    .attr('y', -CARD_H / 2)
    .attr('fill', '#fff')
    .attr('stroke', '#e0e0e0')
    .attr('rx', 2);

  nodeSelection.append('clipPath')
    .attr('id', d => `preview-clip-${d.id}`)
    .append('rect')
    .attr('x', -CARD_W / 2 + IMG_PAD)
    .attr('y', -CARD_H / 2 + IMG_PAD)
    .attr('width', imgW)
    .attr('height', imgH)
    .attr('rx', 1);

  nodeSelection.append('image')
    .attr('clip-path', d => `url(#preview-clip-${d.id})`)
    .attr('x', -CARD_W / 2 + IMG_PAD)
    .attr('y', -CARD_H / 2 + IMG_PAD)
    .attr('width', imgW)
    .attr('height', imgH)
    .attr('preserveAspectRatio', 'xMidYMid slice')
    .attr('href', d => d.artefact.file_paths?.[0] || '');
}

export default function ArtefactForceGraphPreview({ initialArtefacts = [], addedArtefact }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const svgElement = svgRef.current;
    if (!container || !svgElement || initialArtefacts.length < 3) return undefined;

    const previewNodes = [
      ...initialArtefacts.slice(0, 3).map(a => ({ id: a.artifact_id, artefact: a })),
      ...(addedArtefact ? [{ id: addedArtefact.artifact_id, artefact: addedArtefact }] : []),
    ];

    let frameId = 0;
    let startTime = performance.now();
    let teardown = () => {};

    const render = () => {
      teardown();

      const size = container.clientWidth;
      if (!size) return;

      const svg = d3.select(svgElement);
      svg.selectAll('*').remove();
      svg.attr('viewBox', `0 0 ${size} ${size}`);

      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.28;

      const nodes = previewNodes.map(node => ({
        ...node,
        x: cx,
        y: cy,
      }));

      const baseLinks = [];
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
          baseLinks.push({ source: nodes[i], target: nodes[j], kind: 'base' });
        }
      }

      const addedLinks = addedArtefact
        ? nodes.slice(0, 3).map(source => ({
            source,
            target: nodes[3],
            kind: 'added',
          }))
        : [];

      const g = svg.append('g')
        .attr('transform', `translate(${cx},${cy}) scale(${VIEW_ZOOM}) translate(${-cx},${-cy})`);

      const link = g.append('g')
        .selectAll('g')
        .data([...baseLinks, ...addedLinks])
        .enter()
        .append('g')
        .attr('class', d => `force-preview-link force-preview-link--${d.kind}`);

      const linkLines = link.append('line')
        .attr('class', 'force-preview-link-line')
        .attr('stroke', '#d8d8d8')
        .attr('stroke-width', 1);

      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', (d, index) => (
          index === 3 ? 'force-preview-node force-preview-node--added' : 'force-preview-node'
        ));

      const imgW = CARD_W - IMG_PAD * 2;
      const imgH = CARD_H - IMG_PAD * 2;
      appendTile(node, imgW, imgH);

      g.attr('opacity', 0)
        .transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr('opacity', 1);

      startTime = performance.now();

      const animate = (now) => {
        const elapsed = now - startTime;
        const angleOffset = (elapsed / ORBIT_DURATION_MS) * Math.PI * 2;
        const drift = Math.sin(elapsed * 0.00035) * 5;
        const addedProgress = addedArtefact ? addedProgressForElapsed(elapsed) : 0;

        const layout3 = layoutOnCircle(3, cx, cy, radius, angleOffset, drift);
        const layout4 = layoutOnCircle(4, cx, cy, radius, angleOffset, drift);

        nodes.slice(0, 3).forEach((node, index) => {
          node.x = layout3[index].x + (layout4[index].x - layout3[index].x) * addedProgress;
          node.y = layout3[index].y + (layout4[index].y - layout3[index].y) * addedProgress;
        });

        if (nodes[3]) {
          nodes[3].x = cx + (layout4[3].x - cx) * addedProgress;
          nodes[3].y = cy + (layout4[3].y - cy) * addedProgress;
        }

        linkLines
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)
          .attr('stroke-opacity', d => (d.kind === 'added' ? addedProgress : 1));

        node
          .attr('transform', d => `translate(${d.x},${d.y})`)
          .attr('opacity', (d, index) => (index === 3 ? addedProgress : 1));

        frameId = requestAnimationFrame(animate);
      };

      frameId = requestAnimationFrame(animate);
      teardown = () => cancelAnimationFrame(frameId);
    };

    const observer = new ResizeObserver(render);
    observer.observe(container);
    render();

    return () => {
      observer.disconnect();
      teardown();
    };
  }, [initialArtefacts, addedArtefact]);

  return (
    <div ref={containerRef} className="force-graph-preview" aria-hidden="true">
      <svg ref={svgRef} className="force-graph-preview-svg" />
    </div>
  );
}
