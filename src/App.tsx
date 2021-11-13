import {
  Component,
  createEffect,
  createRenderEffect,
  createSignal,
  For,
  Index,
  JSX,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { flatten, random, range, shuffle } from 'lodash-es';
import { match, __, not, select, when } from 'ts-pattern';

import createGameLoop from './createGameLoop';
import createEventListener from '@solid-primitives/event-listener';

type Cell = '0' | 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

type FilledCell = Exclude<Cell, '0'>;

type Grid = Cell[][];

type GridTemplate = string;

type State = {
  grid: Grid;
};

type Direction = 'up' | 'down' | 'left' | 'right';

type Tetromino = {
  x: number;
  y: number;
  color: string;
  template: GridTemplate;
};

type Block = {
  x: number;
  y: number;
  color: string;
  grid: Grid;
  cooldown: number;
  lastTime: number;
};

const COLS = 10;
const ROWS = 16;
const CELL_SIZE = 12;

const TETROMINOS: Record<FilledCell, Tetromino> = {
  I: {
    x: 3,
    y: 0,
    color: 'bg-cyan-400 text-cyan-700',
    template: `
      0I00
      0I00
      0I00
      0I00
    `,
  },
  J: {
    x: 4,
    y: 0,
    color: 'bg-blue-400 text-blue-700',
    template: `
      0J0
      0J0
      JJ0
    `,
  },
  L: {
    x: 3,
    y: 0,
    color: 'bg-orange-400 text-orange-700',
    template: `
      0L0
      0L0
      0LL
    `,
  },
  O: {
    x: 3,
    y: -1,
    color: 'bg-amber-400 text-amber-700',
    template: `
      0000
      0OO0
      0OO0
      0000
    `,
  },
  S: {
    x: 4,
    y: 0,
    color: 'bg-green-400 text-green-700',
    template: `
      S00
      SS0
      0S0
    `,
  },
  T: {
    x: 3,
    y: 0,
    color: 'bg-purple-400 text-purple-700',
    template: `
      0T0
      TTT
      000
    `,
  },
  Z: {
    x: 4,
    y: 0,
    color: 'bg-red-400 text-red-700',
    template: `
      0Z0
      ZZ0
      Z00
    `,
  },
};

const defaultState = (): State => ({
  grid: range(0, ROWS).map(() => range(0, COLS).map(() => '0')),
});

const defaultBlock = (time: number, block?: Block): Block => {
  const shape = shuffle(Object.keys(TETROMINOS))[0] as FilledCell;
  const tetromino = TETROMINOS[shape];

  const grid = tetromino.template
    .trim()
    .split(/\n+/)
    .map((line) => {
      return line.trim().split('') as Cell[];
    });

  const cooldown = block?.cooldown || 1;

  return {
    ...(block && { block }),
    ...tetromino,
    cooldown,
    lastTime: time,
    grid,
  };
};

function detectCollision(grid: Grid, block: Block) {
  for (let y = 0; y < block.grid.length; y++) {
    for (let x = 0; x < block.grid.length; x++) {
      if (block.grid[y][x] === '0') {
        continue;
      }

      const nextX = x + block.x;
      const nextY = y + block.y;

      if (nextX < 0 || nextY < 0 || nextX >= COLS || nextY >= ROWS) {
        return true;
      }

      if (grid[nextY][nextX] !== '0') {
        return true;
      }
    }
  }

  return false;
}

function moveBlock(
  grid: Grid,
  block: Block,
  direction: Direction,
): [boolean, Block] {
  const nextBlock = { ...block };

  match(direction)
    .with('up', 'down', (d) => {
      nextBlock.y = block.y + (d == 'up' ? -1 : 1);
    })
    .with('left', 'right', (d) => {
      nextBlock.x = block.x + (d == 'left' ? -1 : 1);
    })
    .exhaustive();

  return [detectCollision(grid, nextBlock), nextBlock];
}

function rotateBlock(
  grid: Grid,
  block: Block,
  clockwise: boolean,
): [boolean, Block] {
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

  return [detectCollision(grid, nextBlock), nextBlock];
}

function findDropCollision(grid: Grid, block: Block): Block {
  let nextPos = block;
  for (;;) {
    const [collision, nextBlock] = moveBlock(grid, nextPos, 'down');
    if (collision) {
      return nextPos;
    } else {
      nextPos = nextBlock;
    }
  }
}

const Stack: Component = () => {
  const [state, setState] = createStore(defaultState());
  const [block, setBlock] = createSignal(defaultBlock(0));
  const [ghost, setGhost] = createSignal(block());
  const [frame, setFrame] = createSignal(0);
  const [running, setRunning] = createSignal(true);
  const [gameOver, setGameOver] = createSignal(false);

  createRenderEffect(() => {
    setGhost(findDropCollision(state.grid, block()));
  });

  const [time] = createGameLoop(
    (time: number) => {
      setFrame((f) => ++f);

      const b = block();
      if (time >= b.lastTime + b.cooldown) {
        b.lastTime = time;
        const [collision, nextBlock] = moveBlock(state.grid, b, 'down');
        if (collision) {
          for (let y = 0; y < b.grid.length; y++) {
            for (let x = 0; x < b.grid.length; x++) {
              if (b.grid[y][x] !== '0' && x + b.x < COLS && y + b.y < ROWS) {
                setState('grid', y + b.y, x + b.x, b.grid[y][x]);
              }
            }
          }

          setBlock(defaultBlock(time, b));

          if (detectCollision(state.grid, block())) {
            setGameOver(true);
            setRunning(false);
          }
        } else {
          setBlock(nextBlock);
        }
      }

      for (let y = 0; y < ROWS; y++) {
        if (state.grid[y].every((cell) => cell !== '0')) {
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
                range(0, COLS).map(() => '0'),
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
          const [collision, nextBlock] = moveBlock(state.grid, block(), 'left');
          if (!collision) setBlock(nextBlock);
        })
        .with('ArrowRight', running, () => {
          const [collision, nextBlock] = moveBlock(
            state.grid,
            block(),
            'right',
          );
          if (!collision) setBlock(nextBlock);
        })
        .with('ArrowDown', running, () => {
          const [collision, nextBlock] = moveBlock(state.grid, block(), 'down');
          if (!collision) {
            nextBlock.lastTime = time();
            setBlock(nextBlock);
          }
        })
        .with(' ', running, () => {
          setBlock({
            ...findDropCollision(state.grid, block()),
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
            const [collision, nextBlock] = rotateBlock(
              state.grid,
              block(),
              k !== 'z',
            );
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
      <div class="text-white flex font-sat8x8 text-half">
        <div>TIME: {time().toFixed(1)}</div>
        <div class="ml-auto">{frame()}</div>
      </div>
      <div class="border-2 p-px">
        <div class="relative">
          <div class="absolute animate-pulse">
            <Grid
              grid={ghost().grid}
              x={ghost().x}
              y={ghost().y}
              renderCell={(cell) => (
                <div
                  class="border-2 inset-px absolute border-current text-white bg-black border-dashed"
                  style={{
                    opacity: cell !== '0' ? 0.6 : 0,
                    width: `${CELL_SIZE - 2}px`,
                    height: `${CELL_SIZE - 2}px`,
                  }}
                ></div>
              )}
            />
          </div>
          <div class="absolute">
            <Grid grid={block().grid} x={block().x} y={block().y} />
          </div>
          <Grid grid={state.grid} />
          <Show when={!running()}>
            <Show
              when={!gameOver()}
              fallback={
                <div class="font-sat8x8 absolute text-half inset-0 flex items-center justify-center text-white bg-black bg-opacity-80">
                  <div class="text-center">
                    <div>GAME OVER</div>
                    <div>PRESS 'R' TO RESTART</div>
                  </div>
                </div>
              }
            >
              <div class="font-sat8x8 absolute text-half inset-0 flex items-center justify-center text-white bg-black bg-opacity-80">
                <div class="text-center">
                  <div>PAUSED</div>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
};

const Grid: Component<{
  grid: Grid;
  renderCell?: (cell: Cell) => JSX.Element;
  x?: number;
  y?: number;
}> = (props) => {
  const cols = () => props.grid[0].length;
  const rows = () => props.grid.length;

  return (
    <div
      class="relative"
      style={{
        width: `${cols() * CELL_SIZE}px`,
        height: `${rows() * CELL_SIZE}px`,
        transform: `translate(
          ${(props.x || 0) * CELL_SIZE}px,
          ${(props.y || 0) * CELL_SIZE}px
        )`,
      }}
    >
      <Index each={flatten(props.grid)}>
        {(cell, i) => (
          <div
            style={{
              position: 'absolute',
              width: `${CELL_SIZE}px`,
              height: `${CELL_SIZE}px`,
              transform: `translate(
                ${(i % cols()) * CELL_SIZE}px,
                ${Math.trunc(i / cols()) * CELL_SIZE}px
              )`,
            }}
          >
            <Show
              when={props.renderCell}
              fallback={
                <div
                  class={`border border-current ${
                    cell() !== '0'
                      ? TETROMINOS[cell() as FilledCell].color || 'bg-red-600'
                      : ''
                  }`}
                  style={{
                    opacity: cell() !== '0' ? 1 : 0,
                    width: `${CELL_SIZE}px`,
                    height: `${CELL_SIZE}px`,
                  }}
                ></div>
              }
            >
              {props.renderCell?.(cell())}
            </Show>
          </div>
        )}
      </Index>
    </div>
  );
};

const App: Component = () => {
  return (
    <div class="flex flex-col justify-center items-center w-screen h-screen">
      {range(2).map(() => (
        <div class="relative flex justify-center items-center">
          {range(8).map(() => (
            <div class="m-3">
              <Stack />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default App;
