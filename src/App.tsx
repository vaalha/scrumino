import {
  Component,
  createEffect,
  createRenderEffect,
  createSignal,
  For,
  JSX,
  onCleanup,
  Show,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { flatten, random, range, shuffle } from 'lodash-es';
import { match, __, not, select, when } from 'ts-pattern';

import createGameLoop from './createGameLoop';
import createEventListener from '@solid-primitives/event-listener';

type Grid = number[][];

type Shape = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
type Cell = '' | Shape;

type ShapeGrid = Cell[][];

type State = {
  grid: ShapeGrid;
};

type Direction = 'up' | 'down' | 'left' | 'right';

type Tetromino = {
  x: number;
  y: number;
  color: string;
  grid: Grid;
};

type Block = {
  x: number;
  y: number;
  color: string;
  grid: ShapeGrid;

  cooldown: number;
  lastTime: number;
};

const COLS = 10;
const ROWS = 16;

const TETROMINOS: Record<Shape, Tetromino> = {
  I: {
    x: 3,
    y: 0,
    color: 'bg-cyan-400 text-cyan-600',
    grid: [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  },
  J: {
    x: 4,
    y: 0,
    color: 'bg-blue-400 text-blue-600',
    grid: [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  L: {
    x: 3,
    y: 0,
    color: 'bg-orange-400 text-orange-600',
    grid: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
  },
  O: {
    x: 3,
    y: -1,
    color: 'bg-amber-400 text-amber-600',
    grid: [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  S: {
    x: 4,
    y: 0,
    color: 'bg-green-400 text-green-600',
    grid: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  T: {
    x: 3,
    y: 0,
    color: 'bg-purple-400 text-purple-600',
    grid: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  Z: {
    x: 4,
    y: 0,
    color: 'bg-red-400 text-red-600',
    grid: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
};

const defaultState = (): State => ({
  grid: range(0, ROWS).map(() => range(0, COLS).map(() => '')),
});

const defaultBlock = (time: number, block?: Block): Block => {
  const shape = shuffle(Object.keys(TETROMINOS))[0] as Shape;
  const tetromino = TETROMINOS[shape];
  const shapeGrid = tetromino.grid.map((row) =>
    row.map((x) => (x ? shape : '')),
  );

  const cooldown = block?.cooldown || 1;

  return {
    ...(block && { block }),
    ...tetromino,
    cooldown,
    lastTime: time,
    grid: shapeGrid,
  };
};

const detectCollision = (grid: ShapeGrid, block: Block) => {
  for (let x = 0; x < block.grid.length; x++) {
    for (let y = 0; y < block.grid.length; y++) {
      if (!block.grid[y][x]) {
        continue;
      }

      const nextX = x + block.x;
      const nextY = y + block.y;

      if (nextX < 0 || nextY < 0 || nextX >= COLS || nextY >= ROWS) {
        return true;
      }

      if (grid[nextY][nextX] !== '') {
        return true;
      }
    }
  }

  return false;
};

const App: Component = () => {
  const [state, setState] = createStore(defaultState());
  const [block, setBlock] = createSignal(defaultBlock(0));
  const [ghost, setGhost] = createSignal(block());
  const [running, setRunning] = createSignal(true);
  const [frame, setFrame] = createSignal(0);
  const [gameOver, setGameOver] = createSignal(false);

  const stampBlock = (block: Block) => {
    setState(
      produce<State>((draft) => {
        for (let x = 0; x < block.grid.length; x++) {
          for (let y = 0; y < block.grid.length; y++) {
            if (
              block.grid[y][x] !== '' &&
              x + block.x < COLS &&
              y + block.y < ROWS
            ) {
              draft.grid[y + block.y][x + block.x] = block.grid[y][x];
            }
          }
        }
      }),
    );
  };

  const moveBlock = (block: Block, direction: Direction): [boolean, Block] => {
    const nextBlock = { ...block };

    match(direction)
      .with('up', 'down', (d) => {
        nextBlock.y = block.y + (d == 'up' ? -1 : 1);
      })
      .with('left', 'right', (d) => {
        nextBlock.x = block.x + (d == 'left' ? -1 : 1);
      })
      .exhaustive();

    return [detectCollision(state.grid, nextBlock), nextBlock];
  };

  const rotateBlock = (block: Block, clockwise: boolean): [boolean, Block] => {
    const nextBlock = {
      ...block,
      grid: clockwise
        ? block.grid[0].map((_, index) =>
            block.grid.map((row) => row[index]).reverse(),
          )
        : block.grid
            .map((row) => row.reverse())[0]
            .map((_, index) => block.grid.map((row) => row[index])),
    };

    return [detectCollision(state.grid, nextBlock), nextBlock];
  };

  const findDropCollision = (block: Block): Block => {
    let nextPos = block;
    for (;;) {
      const [collision, nextBlock] = moveBlock(nextPos, 'down');
      if (collision) {
        return nextPos;
      } else {
        nextPos = nextBlock;
      }
    }
  };

  createRenderEffect(() => {
    setGhost(findDropCollision(block()));
  });

  const [time] = createGameLoop(
    (time: number) => {
      setFrame((f) => ++f);

      const b = block();
      if (time >= b.lastTime + b.cooldown) {
        b.lastTime = time;
        const [collision, nextBlock] = moveBlock(b, 'down');
        if (collision) {
          stampBlock(block());
          setBlock(defaultBlock(time, block()));

          if (detectCollision(state.grid, block())) {
            setGameOver(true);
            setRunning(false);
          }
        } else {
          setBlock(nextBlock);
        }
      }

      for (let y = 0; y < ROWS; y++) {
        if (state.grid[y].every((cell) => cell !== '')) {
          setBlock((prev) => ({
            ...prev,
            cooldown: prev.cooldown - 0.01,
            lastTime: time,
          }));
          setState(
            produce<State>((draft) => {
              draft.grid.splice(y, 1);
              draft.grid.splice(
                0,
                0,
                range(0, COLS).map(() => ''),
              );
            }),
          );
        }
      }
    },
    1 / 60,
    running,
  );

  createEventListener(window, 'keydown', (e) => {
    if (e instanceof KeyboardEvent) {
      match(e.key)
        .with('ArrowLeft', running, () => {
          const [collision, nextBlock] = moveBlock(block(), 'left');
          if (!collision) setBlock(nextBlock);
        })
        .with('ArrowRight', running, () => {
          const [collision, nextBlock] = moveBlock(block(), 'right');
          if (!collision) setBlock(nextBlock);
        })
        .with('ArrowDown', running, () => {
          const [collision, nextBlock] = moveBlock(block(), 'down');
          if (!collision) {
            nextBlock.lastTime = time();
            setBlock(nextBlock);
          }
        })
        .with(' ', running, () => {
          setBlock({
            ...findDropCollision(block()),
            lastTime: 0,
          });
        })
        .with('r', () => {
          if (!running()) {
            setState(defaultState());
            setBlock(defaultBlock(time()));
            setGameOver(false);
            setRunning(true);
          }
        })
        .with('z', 'x', 'ArrowUp', (k) => {
          if (running()) {
            const [collision, nextBlock] = rotateBlock(block(), k !== 'z');
            if (!collision) setBlock(nextBlock);
          }
        })
        .with('Escape', 'p', () => {
          if (!gameOver()) {
            setRunning(!running());
          }
        })
        .otherwise(() => {});
    }
  });

  return (
    <div class="select-none">
      <div class="text-white text-2xl leading-4 flex">
        <div>TIME: {time().toFixed(1)}</div>
        <div class="ml-auto">{frame()}</div>
      </div>
      <div class="border-2 p-px">
        <div class="relative">
          <div
            class="grid"
            style={{
              'min-width': `calc((75vh / 64 + 4px) * ${COLS}`,
              'grid-template-columns': `repeat(${COLS}, minmax(0, 1fr))`,
            }}
          >
            <For each={flatten(state.grid)}>
              {(cell, i) => <Cell cell={cell} />}
            </For>
          </div>
          <div class="animate-pulse">
            <Block
              block={ghost()}
              renderCell={(cell: Cell) => (
                <Cell
                  cell={cell}
                  class="text-white bg-black border-dashed"
                  style={{ opacity: cell !== '' ? 0.6 : 0 }}
                />
              )}
            />
          </div>
          <Block
            block={block()}
            renderCell={(cell: Cell) => <Cell cell={cell} />}
          />
          <Show when={!running()}>
            <Show
              when={!gameOver()}
              fallback={
                <div class="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-80 text-4xl pt-1">
                  <div class="text-center">
                    <div>GAME OVER</div>
                    <div>PRESS 'R' TO RESTART</div>
                  </div>
                </div>
              }
            >
              <div class="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-80 text-4xl pt-1">
                <div class="text-center">
                  <div>PAUSED</div>
                  <div>PRESS 'P' TO RESUME</div>
                  <div>PRESS 'R' TO RESTART</div>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
};

const Block: Component<{
  block: Block;
  renderCell: (cell: Cell) => JSX.Element;
}> = (props) => (
  <div
    class={`grid ${
      props.block.grid.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
    } absolute`}
    style={{
      'min-width': `calc((75vh / 64 + 4px) * ${props.block.grid.length}`,
      left: `calc((75vh / 64 + 4px) * ${props.block.x})`,
      top: `calc((75vh / 64 + 4px) * ${props.block.y})`,
    }}
  >
    <Show when={props.block}>
      {(block) => <For each={flatten(block.grid)}>{props?.renderCell}</For>}
    </Show>
  </div>
);

const Cell: Component<{
  cell: Cell;
  style?: any;
  class?: string;
}> = (props) => (
  <div
    class={`w-full h-full m-0.5 border-2 border-current ${
      props.class || (props.cell !== '' ? TETROMINOS[props.cell].color : '')
    }`}
    style={{
      opacity: props.cell !== '' ? 1 : 0,
      width: 'calc(75vh / 64)',
      height: 'calc((75vh / 64)',
      ...(props.style && props.style),
    }}
  ></div>
);

const BiggerApp: Component = () => {
  return (
    <div
      class="flex flex-col justify-center items-center w-screen"
      style={{ height: '95vh' }}
    >
      <div class="relative flex flex-wrap justify-center items-center">
        {range(16).map(() => (
          <div class="m-1">
            <App />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BiggerApp;
