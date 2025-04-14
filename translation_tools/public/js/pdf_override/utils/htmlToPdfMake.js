/**
 * Basic HTML to pdfMake converter
 * Note: This is a very basic implementation and won't handle complex HTML
 * For production use, consider a more robust solution
 */
export function htmlToPdfMake(html) {
  const div = document.createElement('div');
  div.innerHTML = html.trim();

  return parseNode(div);

  function parseNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const nodeName = node.nodeName.toLowerCase();

      // Parse children
      const children = [];
      for (let i = 0; i < node.childNodes.length; i++) {
        const result = parseNode(node.childNodes[i]);
        if (result) {
          if (Array.isArray(result)) {
            children.push(...result);
          } else {
            children.push(result);
          }
        }
      }

      // Handle different node types
      switch (nodeName) {
        case 'h1':
          return { text: getTextContent(node), style: 'h1' };
        case 'h2':
          return { text: getTextContent(node), style: 'h2' };
        case 'h3':
          return { text: getTextContent(node), style: 'h3' };
        case 'p':
          return { text: getTextContent(node), style: 'paragraph' };
        case 'strong':
        case 'b':
          return { text: getTextContent(node), bold: true };
        case 'em':
        case 'i':
          return { text: getTextContent(node), italics: true };
        case 'u':
          return { text: getTextContent(node), decoration: 'underline' };
        case 'ul':
          return {
            ul: children
              .filter((child) => typeof child === 'object' && child.text)
              .map((child) => ({ text: child.text })),
          };
        case 'ol':
          return {
            ol: children
              .filter((child) => typeof child === 'object' && child.text)
              .map((child) => ({ text: child.text })),
          };
        case 'li':
          return { text: getTextContent(node) };
        case 'table':
          // This is a simplified table handler
          return {
            table: {
              body: parseTable(node),
            },
          };
        case 'div':
        case 'span':
          if (children.length === 1 && typeof children[0] === 'string') {
            return { text: children[0] };
          }
          return children;
        default:
          return children.length ? children : null;
      }
    }

    return null;
  }

  function getTextContent(node) {
    return node.textContent.trim();
  }

  function parseTable(tableNode) {
    const rows = [];

    // Handle thead rows (header rows)
    const thead = tableNode.querySelector('thead');
    if (thead) {
      const headerRows = thead.querySelectorAll('tr');
      for (let i = 0; i < headerRows.length; i++) {
        const cells = headerRows[i].querySelectorAll('th, td');
        const row = [];
        for (let j = 0; j < cells.length; j++) {
          row.push({ text: cells[j].textContent.trim(), bold: true });
        }
        if (row.length) rows.push(row);
      }
    }

    // Handle tbody rows
    const tbody = tableNode.querySelector('tbody') || tableNode;
    const bodyRows = tbody.querySelectorAll('tr');
    for (let i = 0; i < bodyRows.length; i++) {
      const cells = bodyRows[i].querySelectorAll('td, th');
      const row = [];
      for (let j = 0; j < cells.length; j++) {
        row.push({ text: cells[j].textContent.trim() });
      }
      if (row.length) rows.push(row);
    }

    return rows;
  }
}
