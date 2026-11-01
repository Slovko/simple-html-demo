(() => {
  const canvas = document.querySelector('#flood-scene');
  if (!canvas || !window.THREE) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  } catch {
    canvas.hidden = true;
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smallScreen = window.matchMedia('(max-width: 700px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.25 : 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 160);
  const aim = new THREE.Vector3();
  const clock = new THREE.Clock();
  scene.add(new THREE.HemisphereLight(0xe7fbff, 0x285b83, 2.1));

  const sun = new THREE.DirectionalLight(0xfff4db, 2.7);
  sun.position.set(-8, 15, 11);
  scene.add(sun);

  const material = (color, roughness = .62, metalness = .05, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const pipeMat = material('#536f83', .3, .52);
  const pipeBand = material('#223e56', .35, .45);
  const waterMat = material('#27bfe0', .18, .18, { transparent: true, opacity: .42 });
  const deckMat = material('#b47a43');
  const hullMat = material('#74452f', .46);

  function addBox(parent, size, position, mat, radius = 0) {
    if (radius) {
      const group = new THREE.Group();
      const shaftHeight = Math.max(.05, size[1] - radius * 2);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, shaftHeight, 10), mat);
      group.add(shaft);
      [-1, 1].forEach((side) => {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), mat);
        cap.position.y = side * shaftHeight / 2;
        group.add(cap);
      });
      group.position.set(...position);
      parent.add(group);
      return group;
    }

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  function addPipeSegment(x, length) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.54, .54, length, 32), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(x, 3.2, 0);
    scene.add(pipe);
    [-length / 2 + .65, length / 2 - .65].forEach((offset) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(.67, .67, .16, 32), pipeBand);
      ring.rotation.z = Math.PI / 2;
      ring.position.set(x + offset, 3.2, 0);
      scene.add(ring);
    });
  }

  addPipeSegment(-6.3, 11.1);
  addPipeSegment(7.6, 9.2);

  // A split coupling and a bright water plume mark the AI's "optimization".
  const brokenEnd = new THREE.Mesh(new THREE.CylinderGeometry(.57, .57, .24, 32), material('#f28a53', .28, .25));
  brokenEnd.rotation.z = Math.PI / 2;
  brokenEnd.position.set(-.62, 3.2, 0);
  scene.add(brokenEnd);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(.12, .48, 3.4, 20, 1, true), waterMat);
  jet.position.set(.12, 4.9, 0);
  jet.rotation.z = -.12;
  scene.add(jet);

  // Stylized WebHMI robot standing beside the damaged line.
  const robot = new THREE.Group();
  robot.position.set(-10.4, 0, 2.2);
  scene.add(robot);
  const white = material('#eaf5f8', .28, .12);
  const dark = material('#142c47', .28, .35);
  const glow = material('#30d7ed', .2, .12, { emissive: '#087f9e', emissiveIntensity: .8 });
  addBox(robot, [.8, 1.05, .55], [0, 1.18, 0], white);
  addBox(robot, [.88, .61, .58], [0, 2.1, 0], dark);
  const face = new THREE.Mesh(new THREE.BoxGeometry(.68, .32, .05), material('#07192e', .2));
  face.position.set(0, 2.13, .31); robot.add(face);
  [-.17, .17].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), glow);
    eye.position.set(x, 2.14, .35); robot.add(eye);
  });
  [-.52, .52].forEach((x) => addBox(robot, [.22, .82, .23], [x, 1.3, 0], white, .1));
  [-.22, .22].forEach((x) => addBox(robot, [.23, .45, .25], [x, .25, 0], dark));
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(1.1, .67, .08), dark);
  tablet.position.set(-1.25, 1.2, .3); tablet.rotation.y = -.24; robot.add(tablet);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.9, .47), glow);
  screen.position.set(-1.25, 1.2, .35); screen.rotation.y = -.24; robot.add(screen);

  // Low city silhouettes give the rising water a readable scale.
  const cityMat = material('#93b9c8', .8);
  for (let i = 0; i < 9; i += 1) {
    const height = 2.5 + ((i * 7) % 5) * .72;
    const building = new THREE.Mesh(new THREE.BoxGeometry(1.25 + (i % 3) * .25, height, 1), cityMat);
    building.position.set(-13 + i * 3.15, height / 2 - .15, -7 - (i % 2) * 1.4);
    scene.add(building);
  }

  // Noah's ark: a simple stylized boat with a pair of tiny animal passengers.
  const ark = new THREE.Group();
  ark.position.set(10.8, .4, -1.5);
  scene.add(ark);
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3.8, .5);
  hullShape.lineTo(-3.1, -.55);
  hullShape.quadraticCurveTo(0, -1.15, 3.1, -.55);
  hullShape.lineTo(3.8, .5);
  hullShape.lineTo(-3.8, .5);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 1.35, bevelEnabled: true, bevelSegments: 2, bevelSize: .08, bevelThickness: .1 }), hullMat);
  hull.position.y = .4; hull.position.z = -.68; ark.add(hull);
  addBox(ark, [6.6, .18, 1.7], [0, 1.12, 0], deckMat);
  addBox(ark, [2.2, 1.25, 1.2], [0, 1.78, -.1], material('#d7aa72'));
  addBox(ark, [.24, 2.1, .24], [-.6, 3.25, -.1], hullMat);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), material('#fff4d9', .75, 0, { side: THREE.DoubleSide }));
  sail.position.set(.35, 3.2, -.03); ark.add(sail);

  const animalColors = ['#f0c774', '#7b5a49', '#d8e8ec', '#9cbe80'];
  animalColors.forEach((color, index) => {
    const animal = new THREE.Group();
    const coat = material(color, .75);
    const x = -2.15 + index * 1.38;
    const body = new THREE.Mesh(new THREE.SphereGeometry(.34, 14, 10), coat);
    body.scale.set(1.15, .8, .8); body.position.set(x, 1.55, .08); animal.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.23, 14, 10), coat);
    head.position.set(x + .28, 1.82, .1); animal.add(head);
    [-.1, .1].forEach((earX) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.075, .22, 8), coat);
      ear.position.set(x + .28 + earX, 2.06, .1); animal.add(ear);
    });
    ark.add(animal);
  });

  // Animated water sheet; its movement stays subtle behind the readable panels.
  const waterGeometry = new THREE.PlaneGeometry(60, 42, 48, 28);
  waterGeometry.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeometry, waterMat);
  water.position.set(0, -.12, -2);
  scene.add(water);
  const waterBase = waterGeometry.attributes.position.array.slice();

  const dropCount = smallScreen ? 38 : 72;
  const dropGeometry = new THREE.BufferGeometry();
  const dropPositions = new Float32Array(dropCount * 3);
  const dropSizes = new Float32Array(dropCount);
  for (let i = 0; i < dropCount; i += 1) {
    dropPositions[i * 3] = -.3 + Math.random() * 2.1;
    dropPositions[i * 3 + 1] = 2.7 + Math.random() * 5.2;
    dropPositions[i * 3 + 2] = -.9 + Math.random() * 2.2;
    dropSizes[i] = .035 + Math.random() * .09;
  }
  dropGeometry.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
  const drops = new THREE.Points(dropGeometry, new THREE.PointsMaterial({ color: '#b9f4ff', size: smallScreen ? .13 : .16, transparent: true, opacity: .85, sizeAttenuation: true }));
  scene.add(drops);

  let progress = 0;
  let framePending = false;
  function updateProgress() {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(() => { framePending = false; render(); });
    }
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = smallScreen ? 52 : 42;
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    const chapter = progress * 2;
    const cameraX = chapter < 1 ? THREE.MathUtils.lerp(-8.5, 1.5, chapter) : THREE.MathUtils.lerp(1.5, 12, chapter - 1);
    const cameraY = chapter < 1 ? THREE.MathUtils.lerp(8.5, 6.2, chapter) : THREE.MathUtils.lerp(6.2, 8, chapter - 1);
    const cameraZ = smallScreen ? 26 : 22;
    camera.position.set(cameraX, cameraY, cameraZ);
    aim.set(cameraX * .45 + (smallScreen ? 0 : .7), 1.6, -1.1);
    camera.lookAt(aim);

    ark.position.y = .4 + (reducedMotion ? 0 : Math.sin(t * .85) * .13);
    if (!reducedMotion) {
      const points = waterGeometry.attributes.position.array;
      for (let i = 0; i < points.length; i += 3) {
        const x = waterBase[i];
        const z = waterBase[i + 2];
        points[i + 1] = waterBase[i + 1] + Math.sin(x * .33 + t * .75) * .12 + Math.cos(z * .38 - t * .62) * .1;
      }
      waterGeometry.attributes.position.needsUpdate = true;
      waterGeometry.computeVertexNormals();
      const positions = dropGeometry.attributes.position.array;
      for (let i = 0; i < dropCount; i += 1) {
        positions[i * 3 + 1] = 2.8 + ((dropPositions[i * 3 + 1] - 2.8 + t * (1.1 + (i % 5) * .12)) % 5.1);
      }
      dropGeometry.attributes.position.needsUpdate = true;
      jet.scale.y = 1 + Math.sin(t * 2.5) * .07;
    }
    renderer.render(scene, camera);
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  if (!reducedMotion) {
    const animate = () => { render(); requestAnimationFrame(animate); };
    requestAnimationFrame(animate);
  }
})();
