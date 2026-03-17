'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface UserProduct {
  id: string;
  room: string;
  products: {
    id: string;
    name: string;
    brand: string;
    category: string;
    protocols: string[];
    ecosystems: any;
    home_assistant: string;
    image_url: string;
    requires_hub: string;
    hub_name?: string;
  };
}

interface Props {
  userProducts: UserProduct[];
}

type SimNode = d3.SimulationNodeDatum & {
  id: string;
  name: string;
  brand: string;
  protocols: string[];
  primaryEcosystem: string;
  ecosystems: string[];
  room: string;
};

type SimLink = d3.SimulationLinkDatum<SimNode> & {
  protocol: string;
};

const ECOSYSTEM_COLORS: Record<string, string> = {
  alexa:         '#00A8E1',
  google_home:   '#4285F4',
  apple_homekit: '#6B7280',
  smartthings:   '#00B4D8',
  matter:        '#8B5CF6',
  home_assistant:'#03A9F4',
  none:          '#9CA3AF',
};

const ECOSYSTEM_NAMES: Record<string, string> = {
  alexa:         'Amazon Alexa',
  google_home:   'Google Home',
  apple_homekit: 'Apple HomeKit',
  smartthings:   'SmartThings',
  matter:        'Matter',
  home_assistant:'Home Assistant',
};

const PROTOCOL_COLORS: Record<string, string> = {
  WiFi:       '#10B981',
  Zigbee:     '#F59E0B',
  'Z-Wave':   '#EF4444',
  Thread:     '#8B5CF6',
  Matter:     '#6366F1',
  Bluetooth:  '#3B82F6',
};

const ECO_PRIORITY = ['matter', 'home_assistant', 'alexa', 'google_home', 'apple_homekit', 'smartthings'];

function getPrimaryEcosystem(ecosystems: any, home_assistant: string): string {
  if (home_assistant === 'full') return 'home_assistant';
  for (const eco of ECO_PRIORITY) {
    if (eco !== 'home_assistant' && ecosystems?.[eco] === 'full') return eco;
  }
  return 'none';
}

function getFullEcosystems(ecosystems: any, home_assistant: string): string[] {
  const result: string[] = [];
  if (home_assistant === 'full') result.push('home_assistant');
  for (const eco of ECO_PRIORITY) {
    if (eco !== 'home_assistant' && ecosystems?.[eco] === 'full') result.push(eco);
  }
  return result.length > 0 ? result : ['none'];
}

export default function NetworkDiagram({ userProducts }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || userProducts.length === 0) return;

    const container = containerRef.current;
    const width  = container.clientWidth  || 900;
    const height = container.clientHeight || 560;
    const R = 26; // node radius

    // ── Nodes ──────────────────────────────────────────────────────────────
    const nodes: SimNode[] = userProducts.map(up => ({
      id:               up.id,
      name:             up.products.name,
      brand:            up.products.brand,
      protocols:        up.products.protocols,
      primaryEcosystem: getPrimaryEcosystem(up.products.ecosystems, up.products.home_assistant),
      ecosystems:       getFullEcosystems(up.products.ecosystems, up.products.home_assistant),
      room:             up.room || '',
      x: width  / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));

    // ── Links (one per shared protocol per pair) ────────────────────────────
    const links: SimLink[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        for (const proto of a.protocols) {
          if (b.protocols.includes(proto)) {
            const key = `${a.id}|${b.id}|${proto}`;
            if (!seen.has(key)) {
              seen.add(key);
              links.push({ source: a.id, target: b.id, protocol: proto });
            }
          }
        }
      }
    }

    // ── Ecosystem centroids (evenly distributed around centre) ─────────────
    const presentEcos = Array.from(new Set(nodes.flatMap(n => n.ecosystems)));
    const nonNoneEcos = presentEcos.filter(e => e !== 'none');
    const clusterR    = Math.min(width, height) * 0.28;
    const centroids: Record<string, { x: number; y: number }> = {};

    nonNoneEcos.forEach((eco, i) => {
      const angle = (2 * Math.PI * i) / nonNoneEcos.length - Math.PI / 2;
      centroids[eco] = {
        x: width  / 2 + clusterR * Math.cos(angle),
        y: height / 2 + clusterR * Math.sin(angle),
      };
    });
    centroids['none'] = { x: width / 2, y: height / 2 };

    // Seed positions near ecosystem centroids
    nodes.forEach(n => {
      const c = centroids[n.primaryEcosystem] ?? centroids['none'];
      n.x = c.x + (Math.random() - 0.5) * 80;
      n.y = c.y + (Math.random() - 0.5) * 80;
    });

    // ── SVG ────────────────────────────────────────────────────────────────
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    svg.append('rect')
      .attr('width', width).attr('height', height)
      .attr('fill', '#F8FAFC');

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', e => g.attr('transform', e.transform.toString()));
    svg.call(zoom);

    const hullLayer = g.append('g').attr('class', 'hulls');
    const linkLayer = g.append('g').attr('class', 'links');
    const nodeLayer = g.append('g').attr('class', 'nodes');

    // ── Links ──────────────────────────────────────────────────────────────
    const linkSel = linkLayer
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('stroke',         d => PROTOCOL_COLORS[d.protocol] ?? '#D1D5DB')
      .attr('stroke-width',   1.8)
      .attr('stroke-opacity', 0.45)
      .attr('stroke-dasharray', d =>
        d.protocol === 'Zigbee'   ? '5,3'  :
        d.protocol === 'Z-Wave'   ? '3,3'  :
        d.protocol === 'Bluetooth'? '2,2'  : null
      );

    // ── Node groups ────────────────────────────────────────────────────────
    const nodeSel = nodeLayer
      .selectAll<SVGGElement, SimNode>('g.node')
      .data(nodes, d => d.id)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'grab');

    // Soft glow halo
    nodeSel.append('circle')
      .attr('r', R + 8)
      .attr('fill',         d => ECOSYSTEM_COLORS[d.primaryEcosystem] ?? '#9CA3AF')
      .attr('fill-opacity', 0.1)
      .attr('stroke', 'none');

    // Main circle (white fill, ecosystem-coloured border)
    nodeSel.append('circle')
      .attr('r', R)
      .attr('fill',         'white')
      .attr('stroke',       d => ECOSYSTEM_COLORS[d.primaryEcosystem] ?? '#9CA3AF')
      .attr('stroke-width', 2.5);

    // Protocol dots evenly spaced around the node rim
    nodeSel.each(function(d) {
      const el = d3.select(this);
      const protos = d.protocols.slice(0, 4);
      protos.forEach((proto, i) => {
        const angle = (2 * Math.PI * i) / protos.length - Math.PI / 2;
        el.append('circle')
          .attr('r',  5.5)
          .attr('cx', Math.cos(angle) * R)
          .attr('cy', Math.sin(angle) * R)
          .attr('fill',         PROTOCOL_COLORS[proto] ?? '#9CA3AF')
          .attr('stroke',       'white')
          .attr('stroke-width', 1.5);
      });
    });

    // Device name label (first two words, ≤13 chars)
    nodeSel.append('text')
      .attr('text-anchor',   'middle')
      .attr('dy',            '0.35em')
      .attr('font-size',     '8.5px')
      .attr('font-weight',   '700')
      .attr('fill',          '#1F2937')
      .attr('pointer-events','none')
      .text(d => d.name.split(' ').slice(0, 2).join(' ').slice(0, 13));

    // Room label
    nodeSel.append('text')
      .attr('text-anchor',   'middle')
      .attr('y',             R + 15)
      .attr('font-size',     '9px')
      .attr('fill',          '#9CA3AF')
      .attr('pointer-events','none')
      .text(d => d.room);

    // ── Tooltip ────────────────────────────────────────────────────────────
    const tooltip = d3.select(container)
      .append('div')
      .style('position',       'absolute')
      .style('top',            '0')
      .style('left',           '0')
      .style('background',     'white')
      .style('border',         '1px solid #E5E7EB')
      .style('border-radius',  '10px')
      .style('padding',        '10px 14px')
      .style('font-size',      '12px')
      .style('pointer-events', 'none')
      .style('opacity',        '0')
      .style('transition',     'opacity 0.12s')
      .style('box-shadow',     '0 4px 20px rgba(0,0,0,0.10)')
      .style('max-width',      '210px')
      .style('z-index',        '20')
      .style('line-height',    '1.5');

    nodeSel
      .on('mouseover', (_e, d) => {
        const ecoLabels = d.ecosystems
          .filter(e => e !== 'none')
          .map(e => `<span style="color:${ECOSYSTEM_COLORS[e]}">${ECOSYSTEM_NAMES[e] ?? e}</span>`)
          .join(', ') || '—';

        tooltip.style('opacity', '1').html(
          `<div style="font-weight:700;color:#111;margin-bottom:2px">${d.name}</div>` +
          `<div style="color:#6B7280;margin-bottom:6px">${d.brand}</div>` +
          `<div style="color:#374151;margin-bottom:4px">${d.protocols.join(' · ')}</div>` +
          `<div style="font-size:11px">${ecoLabels}</div>` +
          (d.room ? `<div style="color:#9CA3AF;margin-top:4px;font-size:11px">📍 ${d.room}</div>` : '')
        );
      })
      .on('mousemove', (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', (e.clientX - rect.left + 16) + 'px')
          .style('top',  (e.clientY - rect.top  - 10) + 'px');
      })
      .on('mouseleave', () => tooltip.style('opacity', '0'));

    // ── Drag ───────────────────────────────────────────────────────────────
    const drag = d3.drag<SVGGElement, SimNode>()
      .on('start', function(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', (_event, d) => {
        d.fx = _event.x;
        d.fy = _event.y;
      })
      .on('end', function(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(this).style('cursor', 'grab');
      });

    nodeSel.call(drag);

    // ── Hull + label updater (called every tick) ───────────────────────────
    const lineGen = d3.line<[number, number]>().curve(d3.curveCatmullRomClosed);

    function buildHullPath(pts: [number, number][]): string {
      if (pts.length === 0) return '';

      if (pts.length === 1) {
        const [px, py] = pts[0];
        const r = R + 24;
        // SVG arc circle
        return `M ${px} ${py - r} A ${r},${r} 0 1,1 ${px - 0.001},${py - r} Z`;
      }

      if (pts.length === 2) {
        const dx = pts[1][0] - pts[0][0];
        const dy = pts[1][1] - pts[0][1];
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const pad = R + 24;
        const nx = (-dy / len) * pad;
        const ny = ( dx / len) * pad;
        const capsule: [number, number][] = [
          [pts[0][0] + nx, pts[0][1] + ny],
          [pts[1][0] + nx, pts[1][1] + ny],
          [pts[1][0] - nx, pts[1][1] - ny],
          [pts[0][0] - nx, pts[0][1] - ny],
        ];
        return lineGen(capsule) ?? '';
      }

      const hull = d3.polygonHull(pts);
      if (!hull) return '';
      const cx = d3.mean(hull, p => p[0]) ?? 0;
      const cy = d3.mean(hull, p => p[1]) ?? 0;
      const expanded: [number, number][] = hull.map(([x, y]) => {
        const dx = x - cx, dy = y - cy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return [x + (dx / len) * (R + 24), y + (dy / len) * (R + 24)];
      });
      return lineGen(expanded) ?? '';
    }

    type HullDatum = [string, [number, number][]];

    function updateHulls() {
      const byEco: Record<string, [number, number][]> = {};
      nodes.forEach(n => {
        n.ecosystems.forEach(eco => {
          if (!byEco[eco]) byEco[eco] = [];
          byEco[eco].push([n.x ?? 0, n.y ?? 0]);
        });
      });

      const data: HullDatum[] = Object.entries(byEco);

      // Cluster fill paths
      hullLayer
        .selectAll<SVGPathElement, HullDatum>('.eco-hull')
        .data(data, d => d[0])
        .join('path')
        .attr('class',          'eco-hull')
        .attr('fill',           d => ECOSYSTEM_COLORS[d[0]] ?? '#9CA3AF')
        .attr('fill-opacity',   0.07)
        .attr('stroke',         d => ECOSYSTEM_COLORS[d[0]] ?? '#9CA3AF')
        .attr('stroke-opacity', 0.28)
        .attr('stroke-width',   2)
        .attr('d',              d => buildHullPath(d[1]));

      // Cluster label (above the topmost node)
      hullLayer
        .selectAll<SVGTextElement, HullDatum>('.eco-label')
        .data(data, d => d[0])
        .join('text')
        .attr('class',          'eco-label')
        .attr('text-anchor',    'middle')
        .attr('font-size',      '11px')
        .attr('font-weight',    '600')
        .attr('letter-spacing', '0.03em')
        .attr('fill',           d => ECOSYSTEM_COLORS[d[0]] ?? '#6B7280')
        .attr('fill-opacity',   0.8)
        .attr('pointer-events', 'none')
        .attr('x',  d => d3.mean(d[1], p => p[0]) ?? 0)
        .attr('y',  d => ((d3.min(d[1], p => p[1]) ?? 0) - R - 30))
        .text(d => d[0] !== 'none' ? (ECOSYSTEM_NAMES[d[0]] ?? d[0]) : '');
    }

    // ── Force simulation ───────────────────────────────────────────────────
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force('link',
        d3.forceLink<SimNode, SimLink>(links)
          .id(d => d.id)
          .distance(95)
          .strength(0.2)
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-260))
      .force('collide', d3.forceCollide<SimNode>(R + 12))
      // Cluster attraction: pull each node toward its ecosystem centroid
      .force('cluster-x',
        d3.forceX<SimNode>(n => centroids[n.primaryEcosystem]?.x ?? width  / 2).strength(0.15)
      )
      .force('cluster-y',
        d3.forceY<SimNode>(n => centroids[n.primaryEcosystem]?.y ?? height / 2).strength(0.15)
      )
      // Weak global centering so the whole graph stays on canvas
      .force('center-x', d3.forceX<SimNode>(width  / 2).strength(0.01))
      .force('center-y', d3.forceY<SimNode>(height / 2).strength(0.01));

    simulation.on('tick', () => {
      linkSel
        .attr('x1', d => ((d.source as SimNode).x ?? 0))
        .attr('y1', d => ((d.source as SimNode).y ?? 0))
        .attr('x2', d => ((d.target as SimNode).x ?? 0))
        .attr('y2', d => ((d.target as SimNode).y ?? 0));

      nodeSel.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
      updateHulls();
    });

    // Auto-fit after simulation stabilises
    simulation.on('end', () => {
      const bbox = (g.node() as SVGGElement | null)?.getBBox();
      if (!bbox || bbox.width === 0) return;
      const pad = 40;
      const scale = Math.min(
        0.95,
        (width  - pad * 2) / bbox.width,
        (height - pad * 2) / bbox.height
      );
      const tx = width  / 2 - scale * (bbox.x + bbox.width  / 2);
      const ty = height / 2 - scale * (bbox.y + bbox.height / 2);
      svg.transition().duration(600).call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    });

    return () => {
      simulation.stop();
      tooltip.remove();
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [userProducts]);

  // ── Legend data (derived outside D3) ───────────────────────────────────
  const allProtocols = Array.from(
    new Set(userProducts.flatMap(p => p.products.protocols))
  );
  const allEcosystems = Array.from(
    new Set(
      userProducts
        .flatMap(p => getFullEcosystems(p.products.ecosystems, p.products.home_assistant))
        .filter(e => e !== 'none')
    )
  );

  return (
    <div className="space-y-3">
      {/* D3 canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-slate-50"
        style={{ height: 560 }}
      >
        <svg ref={svgRef} className="w-full h-full" />

        {/* Hint */}
        <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-gray-100 select-none">
          Drag nodes · Scroll to zoom · Pinch to pan
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-8 px-2 py-1">
        {allProtocols.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Protocol connections
            </p>
            <div className="flex flex-wrap gap-4">
              {allProtocols.map(proto => (
                <div key={proto} className="flex items-center gap-1.5">
                  <svg width="18" height="10">
                    <line
                      x1="0" y1="5" x2="18" y2="5"
                      stroke={PROTOCOL_COLORS[proto] ?? '#9CA3AF'}
                      strokeWidth="2"
                      strokeDasharray={
                        proto === 'Zigbee'    ? '5,3' :
                        proto === 'Z-Wave'    ? '3,3' :
                        proto === 'Bluetooth' ? '2,2' : undefined
                      }
                    />
                  </svg>
                  <span className="text-xs text-gray-600">{proto}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allEcosystems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Ecosystem clusters
            </p>
            <div className="flex flex-wrap gap-4">
              {allEcosystems.map(eco => (
                <div key={eco} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                    style={{
                      borderColor:     ECOSYSTEM_COLORS[eco] ?? '#9CA3AF',
                      backgroundColor: (ECOSYSTEM_COLORS[eco] ?? '#9CA3AF') + '22',
                    }}
                  />
                  <span className="text-xs text-gray-600">
                    {ECOSYSTEM_NAMES[eco] ?? eco}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
