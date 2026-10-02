// player.js — first/third-person voxel walker.
// Hover-look (no button held), WASD, Space jump, V camera toggle.
// Simple AABB collision vs colliders; 1-block step-up for stairs.
import * as THREE from 'three';

const HALF = 0.3;      // player half-width
const HEIGHT = 1.7;    // player height
const EYE = 1.6;       // eye height
const STEP = 1.05;     // max step-up (stairs)
const SPEED = 6.0;
const JUMP = 7.6;
const GRAV = 22.0;
const BOUNDS = 55;

export class Player {
  constructor(colliders, spawn = new THREE.Vector3(0, 0, 18)) {
    this.colliders = colliders;
    this.pos = spawn.clone();       // feet position
    this.vy = 0;
    this.yaw = 0;                   // 0 = facing -Z (north, toward the tower)
    this.pitch = 0;
    this.onGround = false;
    this.third = false;
    this.keys = {};
    this.dragging = false;
    this.active = false;            // input enabled after entering
    this.moved = false;
  }

  attach(canvas, avatar) {
    this.avatar = avatar;
    // HOVER-LOOK: mousemove rotates with no button held
    window.addEventListener('mousemove', (e) => {
      if (!this.active || document.activeElement?.tagName === 'INPUT') return;
      const f = this.dragging ? 0.0032 : 0.0022;
      this.yaw -= e.movementX * f;
      this.pitch -= e.movementY * f;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
      this.moved = true;
    });
    // click-drag fallback also rotates
    canvas.addEventListener('mousedown', () => { this.dragging = true; });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('keydown', (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
      if (e.code === 'KeyV') this.third = !this.third;
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  // player AABB at a candidate feet position
  boxAt(x, y, z) {
    return { x0: x - HALF, y0: y, z0: z - HALF, x1: x + HALF, y1: y + HEIGHT, z1: z + HALF };
  }

  overlaps(b) {
    for (const c of this.colliders) {
      if (b.x0 < c.x1 && b.x1 > c.x0 && b.y0 < c.y1 && b.y1 > c.y0 && b.z0 < c.z1 && b.z1 > c.z0)
        return c;
    }
    return null;
  }

  clearAt(x, y, z) { return !this.overlaps(this.boxAt(x, y, z)); }

  // horizontal move along one axis with step-up
  moveAxis(axis, delta) {
    if (delta === 0) return;
    const nx = axis === 'x' ? this.pos.x + delta : this.pos.x;
    const nz = axis === 'z' ? this.pos.z + delta : this.pos.z;
    const c = this.overlaps(this.boxAt(nx, this.pos.y, nz));
    if (!c) {
      if (axis === 'x') this.pos.x = nx; else this.pos.z = nz;
      this.moved = true;
      return;
    }
    // try stepping up onto it (stairs)
    const top = c.y1;
    if (top - this.pos.y <= STEP && top > this.pos.y + 0.001 && this.clearAt(nx, top + 0.001, nz)) {
      this.pos.y = top + 0.001;
      if (axis === 'x') this.pos.x = nx; else this.pos.z = nz;
      this.onGround = true;
      this.vy = 0;
      this.moved = true;
      return;
    }
    // otherwise slide: clamp against the face
    if (axis === 'x') this.pos.x = delta > 0 ? c.x0 - HALF - 0.001 : c.x1 + HALF + 0.001;
    else this.pos.z = delta > 0 ? c.z0 - HALF - 0.001 : c.z1 + HALF + 0.001;
  }

  update(dt, camera) {
    // wish direction from keys, relative to yaw
    const k = this.keys;
    let ix = 0, iz = 0;
    if (k.KeyW || k.ArrowUp) iz -= 1;
    if (k.KeyS || k.ArrowDown) iz += 1;
    if (k.KeyA || k.ArrowLeft) ix -= 1;
    if (k.KeyD || k.ArrowRight) ix += 1;
    const len = Math.hypot(ix, iz) || 1;
    ix /= len; iz /= len;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    // forward = (-sin yaw, -cos yaw)
    const wx = (ix * cy - iz * sy) * SPEED * dt;
    const wz = (-ix * sy - iz * cy) * SPEED * dt;

    const wasGrounded = this.onGround;
    this.onGround = false;
    this.moveAxis('x', wx);
    this.moveAxis('z', wz);

    // vertical
    if ((k.Space) && (wasGrounded || this.onGround)) { this.vy = JUMP; this.onGround = false; this.moved = true; }
    this.vy -= GRAV * dt;
    let ny = this.pos.y + this.vy * dt;
    if (this.vy <= 0) {
      // landing: find highest support top under the player
      const b = this.boxAt(this.pos.x, ny, this.pos.z);
      let support = -Infinity;
      for (const c of this.colliders) {
        if (b.x0 < c.x1 && b.x1 > c.x0 && b.z0 < c.z1 && b.z1 > c.z0) {
          if (c.y1 <= this.pos.y + STEP && c.y1 > support) support = c.y1;
        }
      }
      if (support > -Infinity && ny <= support) {
        ny = support;
        this.vy = 0;
        this.onGround = true;
      }
    } else {
      const c = this.overlaps(this.boxAt(this.pos.x, ny, this.pos.z));
      if (c) { ny = c.y0 - HEIGHT - 0.001; this.vy = 0; }
    }
    this.pos.y = ny;

    // world bounds clamp
    this.pos.x = Math.max(-BOUNDS, Math.min(BOUNDS, this.pos.x));
    this.pos.z = Math.max(-BOUNDS, Math.min(BOUNDS, this.pos.z));
    this.pos.y = Math.max(0, Math.min(40, this.pos.y));

    // camera
    const eye = new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z);
    if (this.third) {
      const d = 4.6;
      const cx = eye.x + Math.sin(this.yaw) * Math.cos(this.pitch) * d;
      const cz = eye.z + Math.cos(this.yaw) * Math.cos(this.pitch) * d;
      const cyy = eye.y + Math.sin(this.pitch) * d + 0.4;
      camera.position.set(cx, Math.max(0.4, cyy), cz);
      camera.lookAt(eye.x, eye.y + 0.1, eye.z);
      if (this.avatar) this.avatar.visible = true;
    } else {
      camera.position.copy(eye);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(this.pitch, this.yaw, 0);
      if (this.avatar) this.avatar.visible = false;
    }
    // avatar follows (visible in third person)
    if (this.avatar) {
      this.avatar.position.set(this.pos.x, this.pos.y, this.pos.z);
      this.avatar.rotation.y = this.yaw + Math.PI; // model faces +Z; yaw faces -Z at 0
      this.avatar.userData.orb.material.color.setHex(0x00d9ff);
    }
  }

  state() { return { p: [this.pos.x, this.pos.y, this.pos.z], yaw: this.yaw }; }
}
