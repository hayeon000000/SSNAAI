// Figma(SSNAAI 홈화면, node-id 176:453)의 장식용 캠퍼스 일러스트.
// 혼잡도 색상이나 건물 이름표 없이, 실제 익스포트된 도형 그대로를 재현한다.

// 단순 사각형 블록(그림자만 있는 평면 사각형).
const FLAT_RECTS = [
  { x: 276, y: 435, width: 52, height: 28 },
  { x: 275, y: 485, width: 65, height: 27 },
  { x: 273, y: 533, width: 61, height: 25 },
  { x: 140, y: 409, width: 122, height: 40 },
  { x: 86, y: 544, width: 73, height: 30 },
  { x: 54, y: 288, width: 16, height: 59 },
  { x: 76, y: 281, width: 20, height: 103 },
];

// 복합 도형(꺾인 형태). translate는 원본 Figma 좌표계 기준.
const COMPLEX_SHAPES = [
  { translate: [52.5, 390], d: 'M18.5 0H38.5V71H4V46H18.5V0Z' },
  { translate: [76.5, 192], d: 'M14.5 0L61 66.5H113.5V84H39V71.5L4 7.5L14.5 0Z' },
  { translate: [112, 308], d: 'M4 28.5H31V0H83V22H56V32.5H83V51.5H4V28.5Z' },
  { translate: [196, 347], d: 'M4 0H26V24H62V43H4V0Z' },
];

export default function CampusMap() {
  return (
    <svg viewBox="44 182 294 402" className="w-full h-full" role="img" aria-label="캠퍼스 일러스트">
      <defs>
        <filter id="mapShapeShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="#a78bba" floodOpacity="0.5" />
        </filter>
      </defs>

      <g filter="url(#mapShapeShadow)">
        {FLAT_RECTS.map(({ x, y, width, height }, i) => (
          <rect key={i} x={x} y={y} width={width} height={height} fill="#f4ebf7" />
        ))}

        {COMPLEX_SHAPES.map(({ translate, d }, i) => (
          <path key={i} d={d} fill="#f4ebf7" transform={`translate(${translate[0]} ${translate[1]})`} />
        ))}
      </g>
    </svg>
  );
}
