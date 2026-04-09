import { useState, useRef, type RefObject } from "react";
import { Input, Button, Modal, Row, Col, Space } from "antd";
import { EditorView } from "@codemirror/view";
import { parseCmToHtml, printHtmlToPdf } from '../../../../hooks/useMd2pdf'
import aiGenCSS from '../../../../utils/aiGenCSS'

interface GenPDFProps {
  viewRef: RefObject<EditorView | null>;
  getImageUrl: (url: string) => Promise<string | undefined>;
}
const GenPDF = (props: GenPDFProps) => {
  const { viewRef, getImageUrl } = props;
  const [customCss, setCustomCss] = useState<string>("")
  const [visible, setVisible] = useState(false)
  const [userInput, setUserInput] = useState<string>("")
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 调用AI生成CSS
  const genCustomCss = async () => {
    const prompt = userInput + `请根据以下Markdown内容生成自定义CSS样式，确保打印时符合A4纸张尺寸：\n${viewRef.current?.state.doc.toString()}`;
    const css = await aiGenCSS(prompt) || "";
    setCustomCss(css);
  }

  async function openPreview() {
    setVisible(true)
    // 等待 Modal 和 iframe 渲染完成
    setTimeout(async () => {
      try {
        if (!iframeRef.current) return;
        const el = await parseCmToHtml({ view: viewRef.current!, getImageUrl });

        // 如果用户提供了 ai 样式输入，尝试生成并注入
        let css = "";
        if (customCss) {
          css = customCss;
        }

        // 注入自定义 CSS
        const styleEl = document.createElement("style");
        styleEl.textContent = css;
        el.prepend(styleEl);

        printHtmlToPdf(el, "CodeMirror-Markdown-Export", iframeRef.current);
      } catch (e) {
        console.log("生成预览失败", e);
      }
    }, 100);
  }

  const doPrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
    setVisible(false);
  }

  return (
    <>
      <Button onClick={openPreview}>生成PDF</Button>
      <Modal
        title="预览并打印 (A4 模拟)"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width='90vw'
        destroyOnClose={true}
        centered
        styles={{ body: { padding: '12px', backgroundColor: '#f5f5f5' } }}
      >
        <Row gutter={16}>
          <Col span={17}>
            <div style={{ height: '75vh', overflow: 'auto', background: '#e8e8e8', borderRadius: '4px', border: '1px solid #d9d9d9' }}>
              <iframe
                ref={iframeRef}
                style={{ width: '100%', minHeight: '100%', border: 'none', display: 'block' }}
                title="pdf-preview"
              />
            </div>
          </Col>
          <Col span={7}>
            <Space direction="vertical" style={{ width: '100%', background: '#fff', padding: '16px', borderRadius: '4px', border: '1px solid #d9d9d9' }}>
              <Button type="primary" size="large" onClick={doPrint} block>立即打印</Button>
              <Button size="large" onClick={async () => {
                await genCustomCss();
                openPreview();
              }} block>生成AI CSS</Button>
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="自定义提示"
                style={{ marginBottom: 12 }}
              />
              <Button size="large" onClick={() => {
                openPreview();
              }} block>刷新预览</Button>
              <Button size="large" onClick={() => setVisible(false)} block>关闭</Button>

              <div style={{ marginTop: 24 }}>
                <div style={{ marginBottom: 8, fontWeight: 'bold' }}>自定义额外 CSS</div>
                <Input.TextArea
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  rows={18}
                  placeholder="例如: 
h1 { color: red; }
.markdown-print-body { font-size: 14px; }"
                  style={{ fontFamily: 'monospace' }}
                />
                <div style={{ marginTop: 8, fontSize: '12px', color: '#8c8c8c' }}>
                  提示：输入 CSS 后点击“刷新预览”查看效果。
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Modal>
    </>
  );
};

export default GenPDF;