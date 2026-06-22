import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import './ArtefactForceGraph.css';

const CARD_W = 160;
const CARD_H = 130;

export default function ArtefactForceGraph({ artefacts, onSelect }) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  const buildGraph = useCallback(() => {
    if (!artefacts.length) return { nodes: [], links: [] };

    const nodes = artefacts.map(a => ({
      id: a.artifact_id,
      artefact: a,
      x: Math.random() * 800,
      y: Math.random() * 600,
    }));

    const links = [];
    const seen = new Set();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = artefacts[i];
        const b = artefacts[j];
        const tagsA = [
          ...(a.tags?.themes || []),
          ...(a.tags?.design_as || []),
          ...(a.tags?.methods || []),
        ];
        const tagsB = [
          ...(b.tags?.themes || []),
          ...(b.tags?.design_as || []),
          ...(b.tags?.methods || []),
        ];
        const shared = tagsA.filter(t => tagsB.includes(t));
        if (shared.length >= 2) {
          const key = `${nodes[i].id}-${nodes[j].id}`;
          if (!seen.has(key)) {
            seen.add(key);
            links.push({ source: nodes[i].id, target: nodes[j].id, strength: shared.length });
          }
        }
      }
    }

    return { nodes, links };
  }, [artefacts]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { nodes, links } = buildGraph();
    if (!nodes.length) return;

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;

    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(280).strength(d => Math.min(d.strength * 0.08, 0.4)))
      .force('charge', d3.forceManyBody().strength(-600))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(CARD_W * 0.7));

    simulationRef.current = simulation;

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#ddd')
      .attr('stroke-width', d => Math.min(d.strength * 0.5, 2));

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'force-node')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x; d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    node.append('rect')
      .attr('width', CARD_W)
      .attr('height', CARD_H)
      .attr('x', -CARD_W / 2)
      .attr('y', -CARD_H / 2)
      .attr('fill', '#fff')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => { event.stopPropagation(); onSelect(d.artefact); });

    node.append('image')
      .attr('x', -CARD_W / 2 + 4)
      .attr('y', -CARD_H / 2 + 4)
      .attr('width', CARD_W - 8)
      .attr('height', 76)
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .attr('href', d => d.artefact.file_paths?.[0] || '')
      .style('pointer-events', 'none');

    node.append('text')
      .attr('y', CARD_H / 2 - 32)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#000')
      .text(d => d.artefact.title?.length > 22 ? d.artefact.title.slice(0, 22) + '…' : d.artefact.title)
      .style('pointer-events', 'none');

    node.each(function(d) {
      const tagList = [
        ...(d.artefact.tags?.themes || []).slice(0, 1),
        ...(d.artefact.tags?.design_as || []).slice(0, 1),
      ].slice(0, 2);

      const grp = d3.select(this);
      tagList.forEach((tag, i) => {
        grp.append('rect')
          .attr('x', -CARD_W / 2 + 6 + i * 68)
          .attr('y', CARD_H / 2 - 22)
          .attr('width', 62)
          .attr('height', 14)
          .attr('rx', 7)
          .attr('fill', '#f0f0f0')
          .style('pointer-events', 'none');

        grp.append('text')
          .attr('x', -CARD_W / 2 + 6 + i * 68 + 31)
          .attr('y', CARD_H / 2 - 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('fill', '#555')
          .text(tag.length > 9 ? tag.slice(0, 9) + '…' : tag)
          .style('pointer-events', 'none');
      });
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [buildGraph, onSelect]);

  return (
    <div className="force-graph">
      <svg ref={svgRef} className="force-graph-svg" />
    </div>
  );
}
