import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { loadGLTFModel } from '../lib/model';
import { DogContainer, DogSpinner } from './VoxelDogLoader';

function easeOutCirc(x) {
  return Math.sqrt(1 - Math.pow(x - 1, 4));
}

const VoxelDog = () => {
  const refContainer = useRef(null);
  console.log('refContainer: ', refContainer);
  const [loading, setLoading] = useState(true);
  const refRenderer = useRef();

  const urlDogGLB = (process.env.NODE_ENV === 'production'
    ? 'https://craftzdog.global.ssl.fastly.net/homepage'
    : '') + '../../public/dog.glb';

  const handleWindowResize = useCallback(() => {
    const { current: renderer } = refRenderer;
    const { current: container } = refContainer;
    if (container && renderer) {
      const scW = container.clientWidth;
      const scH = container.clientHeight;
      renderer.setSize(scW, scH);
    }
  }, []);

  console.log(123)

  useEffect(() => {
    console.log('useEffect started');
    console.log('refContainer: ', refContainer);

    const { current: container } = refContainer;

    if (!container) {
      console.log('Container is null');
      return;
    }

    console.log('Container is not null');

    const scW = container.clientWidth;
    const scH = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(scW, scH);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);
    refRenderer.current = renderer;
    const scene = new THREE.Scene();

    const target = new THREE.Vector3(-0.5, 1.2, 0);
    const initialCameraPosition = new THREE.Vector3(
      20 * Math.sin(0.2 * Math.PI),
      10,
      20 * Math.cos(0.2 * Math.PI),
    );

    const scale = scH * 0.005 + 4.8;
    const camera = new THREE.OrthographicCamera(
      -scale,
      scale,
      scale,
      -scale,
      0.01,
      50000,
    );
    camera.position.copy(initialCameraPosition);
    camera.lookAt(target);

    const ambientLight = new THREE.AmbientLight(0xcccccc, Math.PI);
    scene.add(ambientLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.target = target;

    console.log('load 1');

    loadGLTFModel(scene, urlDogGLB, {
      receiveShadow: false,
      castShadow: false,
    }).then(() => {
      console.log('load 2');
      animate();
      console.log('load 3');
      setLoading(false);
      console.log('load 4');
    }).catch((error) => {
      console.log('Error loading model:', error);
    });

    console.log('load 5');

    let req = null;
    let frame = 0;
    const animate = () => {
      req = requestAnimationFrame(animate);

      frame = frame <= 100 ? frame + 1 : frame;

      if (frame <= 100) {
        const p = initialCameraPosition;
        const rotSpeed = -easeOutCirc(frame / 120) * Math.PI * 20;

        camera.position.y = 10;
        camera.position.x =
          p.x * Math.cos(rotSpeed) + p.z * Math.sin(rotSpeed);
        camera.position.z =
          p.z * Math.cos(rotSpeed) - p.x * Math.sin(rotSpeed);
        camera.lookAt(target);
      } else {
        controls.update();
      }

      renderer.render(scene, camera);
    };

    return () => {
      cancelAnimationFrame(req);
      if (renderer.domElement) {
        renderer.domElement.remove();
      }
      renderer.dispose();
    };
  }, [refContainer]);

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize, false);
    return () => {
      window.removeEventListener('resize', handleWindowResize, false);
    };
  }, [handleWindowResize]);

  return (
    <DogContainer ref={refContainer}>
      {loading && <DogSpinner />}
    </DogContainer>
  );
};

export default VoxelDog;