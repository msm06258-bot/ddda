import { Application } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { createMapRenderer, pawnAtPixel, TILE_SIZE } from './mapRenderer';

/** Hosts the PixiJS canvas. Redraws entities whenever the store's game state or selection changes. */
export function MapView() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    const renderer = createMapRenderer();
    let disposed = false;
    let ready = false;
    let unsubscribe: (() => void) | undefined;

    const { map } = useGameStore.getState().game;
    void app
      .init({
        width: map.width * TILE_SIZE,
        height: map.height * TILE_SIZE,
        background: 0x1b1712,
        antialias: true,
      })
      .then(() => {
        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }
        ready = true;
        host.appendChild(app.canvas);
        app.stage.addChild(renderer.root);

        let lastMap = useGameStore.getState().game.map;
        renderer.drawTerrain(lastMap);
        const draw = () => {
          const { game, selectedId } = useGameStore.getState();
          if (game.map !== lastMap) {
            lastMap = game.map;
            renderer.drawTerrain(lastMap);
          }
          renderer.drawEntities(game, selectedId);
        };
        draw();
        unsubscribe = useGameStore.subscribe(draw);

        app.canvas.addEventListener('click', (e) => {
          const rect = app.canvas.getBoundingClientRect();
          const scale = app.canvas.width / app.renderer.resolution / rect.width;
          const { game, select } = useGameStore.getState();
          select(pawnAtPixel(game, (e.clientX - rect.left) * scale, (e.clientY - rect.top) * scale));
        });
      });

    return () => {
      disposed = true;
      unsubscribe?.();
      if (ready) app.destroy(true, { children: true });
    };
  }, []);

  return <div ref={hostRef} className="map-view" />;
}
