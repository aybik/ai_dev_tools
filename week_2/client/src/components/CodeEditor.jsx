import Editor from "@monaco-editor/react";

const languageMap = {
  javascript: "javascript",
  python: "python",
  java: "java"
};

function CodeEditor({ value, language, onChange }) {
  return (
    <div className="editor">
      <Editor
        height="70vh"
        theme="vs-dark"
        language={languageMap[language] || "javascript"}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true
        }}
      />
    </div>
  );
}

export default CodeEditor;
