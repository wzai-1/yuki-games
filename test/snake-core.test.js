import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  stepState,
  placeApple,
  collidesWithBody,
  withinBounds,
} from '../snake-core.js';

function makeState(overrides = {}){
  return {
    ...createInitialState({ grid: 6, tickBase: 140, rng: () => 0.01 }),
    ...overrides,
  };
}

test('withinBounds works', () => {
  assert.equal(withinBounds({x:0,y:0}, 6), true);
  assert.equal(withinBounds({x:5,y:5}, 6), true);
  assert.equal(withinBounds({x:-1,y:0}, 6), false);
  assert.equal(withinBounds({x:0,y:6}, 6), false);
});

test('moving into tail cell is allowed when not growing', () => {
  // snake shaped so that next move into current tail is okay
  const snake = [
    {x:2,y:2}, // head
    {x:2,y:3},
    {x:1,y:3},
    {x:1,y:2}, // tail
  ];

  const newHead = {x:1,y:2};
  assert.equal(collidesWithBody(newHead, snake, false), false);
  assert.equal(collidesWithBody(newHead, snake, true), true);
});

test('stepState triggers wall game over', () => {
  const st = makeState({
    snake: [{x:5,y:0},{x:4,y:0},{x:3,y:0}],
    dir: {x:1,y:0},
    nextDir: {x:1,y:0},
  });
  const r = stepState(st);
  assert.equal(r.state.gameOver, true);
  assert.equal(r.event, 'gameover_wall');
});

test('stepState eat increases score and clears apple (needs re-place)', () => {
  const st = makeState({
    snake: [{x:2,y:2},{x:1,y:2},{x:0,y:2}],
    dir: {x:1,y:0},
    nextDir: {x:1,y:0},
    apple: {x:3,y:2},
    score: 0,
    eaten: 0,
    tickMs: 140,
  });
  const r = stepState(st);
  assert.equal(r.state.score, 10);
  assert.equal(r.state.eaten, 1);
  assert.equal(r.state.apple, null);
});

test('placeApple never places on the snake', () => {
  const snake = [{x:0,y:0},{x:1,y:0},{x:2,y:0}];
  const apple = placeApple(() => 0.0, snake, 6);
  // rng returns 0 so naive would be (0,0) but snake occupies it; function must find empty.
  const onSnake = snake.some(s => s.x === apple.x && s.y === apple.y);
  assert.equal(onSnake, false);
});
