import { PDFDownloadLink } from '@react-pdf/renderer'
import { InstructionPdf } from './InstructionPdf'
import type { GeneratedCubeGroup, MosaicPlan, RubikColor } from '../types'

export function PdfExport({
  plan,
  groups,
  outputGrid,
}: {
  plan: MosaicPlan
  groups: GeneratedCubeGroup[]
  outputGrid: RubikColor[][]
}) {
  return (
    <PDFDownloadLink
      document={<InstructionPdf plan={plan} groups={groups} outputGrid={outputGrid} />}
      fileName="rubiks-cube-art-instructions.pdf"
      className="secondary-button pdf-button"
    >
      {({ loading }) => (loading ? 'Preparing PDF' : 'Export PDF')}
    </PDFDownloadLink>
  )
}
