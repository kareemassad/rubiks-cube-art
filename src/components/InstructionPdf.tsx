import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { COLOR_HEX } from '../core/cube'
import { PDF_MOUNT_COPY, RUBIK_COLOR_NAMES } from '../constants/rubiks'
import { getPdfMosaicDimensions } from './pdfLayout'
import type { GeneratedCubeGroup, MosaicPlan, RubikColor, TargetFace } from '../types'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#f7f3e8',
    color: '#111827',
    fontFamily: 'Helvetica',
  },
  cover: {
    borderWidth: 2,
    borderColor: '#111827',
    backgroundColor: '#fffdf7',
    padding: 18,
    marginBottom: 18,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverText: {
    width: '58%',
  },
  kicker: {
    fontSize: 9,
    color: '#b91c1c',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: 700,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 10,
    lineHeight: 1,
  },
  meta: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 14,
  },
  statGrid: {
    width: '38%',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#eef5ff',
    padding: 8,
    marginLeft: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
  },
  statLabel: {
    fontSize: 8,
    color: '#374151',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 10,
  },
  mosaic: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#111827',
    marginBottom: 12,
    alignSelf: 'center',
  },
  mosaicRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  sticker: {
    width: 5,
    height: 5,
    borderWidth: 0.25,
    borderColor: '#111827',
  },
  groupGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupCard: {
    width: '31%',
    minHeight: 160,
    borderWidth: 1.5,
    borderColor: '#111827',
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
  },
  face: {
    width: 62,
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#111827',
    marginBottom: 7,
  },
  faceRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  faceSticker: {
    width: 20,
    height: 20,
    borderWidth: 0.75,
    borderColor: '#111827',
  },
  text: {
    fontSize: 8.5,
    color: '#374151',
    lineHeight: 1.35,
    marginBottom: 3,
  },
  moves: {
    fontSize: 8.5,
    color: '#111827',
    lineHeight: 1.35,
  },
})

function FacePdf({ face }: { face: TargetFace }) {
  return (
    <View style={styles.face}>
      {face.map((row, rowIndex) => (
        <View key={`face-row-${rowIndex}`} style={styles.faceRow}>
          {row.map((color, colIndex) => (
            <View
              key={`${rowIndex}-${colIndex}-${color}`}
              style={[styles.faceSticker, { backgroundColor: COLOR_HEX[color] }]}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

function MosaicPdf({ grid, rows, cols }: { grid: RubikColor[][]; rows: number; cols: number }) {
  const { width, height, stickerSize } = getPdfMosaicDimensions(rows, cols)
  return (
    <View style={[styles.mosaic, { width, height }]}>
      {grid.map((row, rowIndex) => (
        <View key={`mosaic-row-${rowIndex}`} style={styles.mosaicRow}>
          {row.map((color, colIndex) => (
            <View
              key={`${rowIndex}-${colIndex}`}
              style={[
                styles.sticker,
                { width: stickerSize, height: stickerSize, backgroundColor: COLOR_HEX[color] },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

export function InstructionPdf({
  plan,
  groups,
  outputGrid,
}: {
  plan: MosaicPlan
  groups: GeneratedCubeGroup[]
  outputGrid: RubikColor[][]
}) {
  return (
    <Document
      title="Rubik's Cube Art Instructions"
      author="Rubik's Cube Art Generator"
      language="en"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.cover}>
          <View style={styles.coverText}>
            <Text style={styles.kicker}>Rubik's Cube Art Generator</Text>
            <Text style={styles.title}>Build Instructions</Text>
            <Text style={styles.meta}>
              {plan.rows} x {plan.cols} cubes · {plan.rows * plan.cols} total cubes · {groups.length} unique groups
            </Text>
          </View>
          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{plan.rows}</Text>
              <Text style={styles.statLabel}>Rows</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{plan.cols}</Text>
              <Text style={styles.statLabel}>Columns</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{groups.length}</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Generated Mosaic</Text>
        <MosaicPdf grid={outputGrid} rows={plan.rows} cols={plan.cols} />
        <Text style={styles.meta}>
          {plan.cacheStats.hits} duplicate faces reused · {plan.cacheStats.rotationHits} rotated matches
        </Text>
      </Page>
      <Page size="LETTER" style={styles.page} wrap>
        <Text style={styles.sectionTitle}>Cube Groups</Text>
        <View style={styles.groupGrid}>
          {groups.map((group, index) => {
            const cube = group.cube
            return (
              <View key={group.id} style={styles.groupCard} wrap={false}>
                <Text style={styles.groupHeader}>
                  Group {index + 1}: {group.indices.length}x
                </Text>
                <FacePdf face={cube.outputFace} />
                <Text style={styles.text}>Hold {RUBIK_COLOR_NAMES[cube.displayFace]} center facing you.</Text>
                <Text style={styles.text}>{PDF_MOUNT_COPY[cube.mountRotation]}</Text>
                <Text style={styles.moves}>
                  {cube.buildMoves.length > 0 ? cube.buildMoves.join(' ') : 'No twists. Use the solved face.'}
                </Text>
              </View>
            )
          })}
        </View>
      </Page>
    </Document>
  )
}
