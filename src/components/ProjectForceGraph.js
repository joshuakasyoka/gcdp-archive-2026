import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { isPriorityTag } from '../config/priorityTags';
import './ArtefactForceGraph.css';

const CARD_W = 160;
const CARD_H = 130;
const IMAGE_H = 96;

const LINK_CATEGORIES = [
  { key: 'themes', label: 'Theme' },
  { key: 'design_as', label: 'Design as' },
  { key: 'methods', label: 'Method' },
];

function getSharedLinkInfo(tagsA, tagsB) {
  const shared = [];
  for (const { key } of LINK_CATEGORIES) {
    const a = (tagsA?.[key] || []).filter(t => isPriorityTag(key, t));
    const b = (tagsB?.[key] || []).filter(t => isPriorityTag(key, t));
    for (const t of a) {
      if (b.includes(t)) shared.push(t);
    }
  }
  return { shared, label: shared.join(' · ') };
}

function nodeId(linkEnd) {
  return typeof linkEnd === 'object' ? linkEnd.id : linkEnd;
}

function layoutNodesInCircle(nodes, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(
    Math.min(width, height) / 2 - CARD_W * 0.8,
    CARD_W * 2,
  );
  const step = (2 * Math.PI) / nodes.length;
  nodes.forEach((node, i) => {
    const angle = i * step - Math.PI / 2;
    node.x = cx + radius * Math.cos(angle);
    node.y = cy + radius * Math.sin(angle);
    node.vx = 0;
    node.vy = 0;
  });
}

export default function ProjectForceGraph({ projects }) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const navigate = useNavigate();

  const buildGraph = useCallback(() => {
    if (!projects.length) return { nodes: [], links: [] };

    const nodes = projects.map(p => ({
      id: p.project_id,
      project: p,
    }));

    const links = [];
    const seen = new Set();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const { shared, label } = getSharedLinkInfo(
          projects[i]._flatTags,
          projects[j]._flatTags,
        );
        if (shared.length >= 2) {
          const key = `${nodes[i].id}-${nodes[j].id}`;
          if (!seen.has(key)) {
            seen.add(key);
            links.push({
              source: nodes[i].id,
              target: nodes[j].id,
              strength: shared.length,
              label,
            });
          }
        }
      }
    }

    return { nodes, links };
  }, [projects]);

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

    layoutNodesInCircle(nodes, width, height);

    const simulation = d3.forceSimulation(nodes)
      .velocityDecay(0.72)
      .alpha(0.12)
      .alphaDecay(0.008)
      .force('link', d3.forceLink(links).id(d => d.id).distance(420).strength(d => Math.min(d.strength * 0.04, 0.18)))
      .force('charge', d3.forceManyBody().strength(-1100))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.04))
      .force('collision', d3.forceCollide().radius(CARD_W * 0.9).strength(0.5));

    simulationRef.current = simulation;

    const link = g.append('g')
      .attr('class', 'force-links')
      .selectAll('g')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'force-link');

    link.append('line')
      .attr('class', 'force-link-line')
      .attr('stroke', '#ddd')
      .attr('stroke-width', d => Math.min(d.strength * 0.5, 2));

    link.append('text')
      .attr('class', 'force-link-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#444')
      .text(d => d.label)
      .style('pointer-events', 'none')
      .style('opacity', 0);

    function setHighlight(hoveredId) {
      const connectedIds = new Set();
      if (hoveredId) {
        connectedIds.add(hoveredId);
        for (const l of links) {
          const sid = nodeId(l.source);
          const tid = nodeId(l.target);
          if (sid === hoveredId) connectedIds.add(tid);
          if (tid === hoveredId) connectedIds.add(sid);
        }
      }

      node.classed('force-node--dimmed', d => hoveredId && !connectedIds.has(d.id));
      node.classed('force-node--connected', d => hoveredId && connectedIds.has(d.id) && d.id !== hoveredId);
      node.classed('force-node--hovered', d => d.id === hoveredId);

      link.each(function(l) {
        const sid = nodeId(l.source);
        const tid = nodeId(l.target);
        const isConnected = hoveredId && (sid === hoveredId || tid === hoveredId);
        const el = d3.select(this);
        el.classed('force-link--active', isConnected);
        el.classed('force-link--dimmed', hoveredId && !isConnected);
        el.select('.force-link-label').style('opacity', isConnected ? 1 : 0);
      });
    }

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'force-node')
      .on('mouseenter', (event, d) => {
        event.stopPropagation();
        setHighlight(d.id);
      })
      .on('mouseleave', () => setHighlight(null))
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.1).restart();
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
      .on('click', (event, d) => {
        event.stopPropagation();
        navigate(`/projects/${d.project.project_id}`);
      });

    node.append('image')
      .attr('x', -CARD_W / 2 + 4)
      .attr('y', -CARD_H / 2 + 4)
      .attr('width', CARD_W - 8)
      .attr('height', IMAGE_H)
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .attr('href', d => d.project.project_photos?.[0]?.url || d.project.artifacts?.[0]?.file_paths?.[0] || '')
      .style('pointer-events', 'none');

    node.append('text')
      .attr('y', CARD_H / 2 - 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#000')
      .text(d => {
        const title = d.project.title || '';
        return title.length > 22 ? title.slice(0, 22) + '…' : title;
      })
      .style('pointer-events', 'none');

    node.attr('transform', d => `translate(${d.x},${d.y})`);

    g.attr('opacity', 0)
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);

    simulation.on('tick', () => {
      link.each(function(d) {
        const x1 = d.source.x;
        const y1 = d.source.y;
        const x2 = d.target.x;
        const y2 = d.target.y;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        const flip = angle > 90 || angle < -90;
        const labelAngle = flip ? angle + 180 : angle;

        d3.select(this).select('.force-link-line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2);

        d3.select(this).select('.force-link-label')
          .attr('transform', `translate(${midX},${midY}) rotate(${labelAngle})`);
      });
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [buildGraph, navigate]);

  return (
    <div className="force-graph">
      <svg ref={svgRef} className="force-graph-svg" />
    </div>
  );
}
