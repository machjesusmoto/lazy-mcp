# Release Notes - v0.4.2

**Release Date**: 2025-10-11

## 🐛 Critical Bug Fix

Fixed viewport calculation bug that caused items to disappear from the unified list. This was a critical issue affecting all users of v0.4.1 and v0.4.0.

### What Was Fixed

**Missing Items Bug**:
- Section headers with `marginY={1}` were incorrectly counted as 2 lines instead of 3 (top margin + content + bottom margin)
- This caused the viewport to think it could fit more items than physically possible
- Result: Items randomly disappeared from the middle and end of lists
- Affected all item types: MCP servers, memory files, and subagents

**Specific Improvements**:
- ✅ Fixed section header line counting (3 lines for `marginY={1}`, 2 lines for `marginBottom={1}`)
- ✅ Implemented backwards-building algorithm for end-of-list scrolling
- ✅ Added iterative adjustment for middle scrolling to ensure selected item visibility
- ✅ Corrected total available lines calculation: `height - 5` (borders + title + scroll indicator + margin)
- ✅ Verified across multiple terminal window sizes

## ✨ Visual Enhancements

**Improved Readability**:
- Token estimates now display in **cyan/bold** to stand out prominently
- Navigation keys (**Enter**, **Q**, **Tab**, **Space**, **↑/↓**) highlighted in **cyan/bold**
- Selection highlight uses black text on cyan background for better contrast

## 🧪 Testing

- Extensively tested with multiple window heights and widths
- Verified all items display correctly:
  - All MCP servers (including Playwright)
  - All memory files
  - All subagents (70+ items tested)
- Smooth scrolling throughout entire list
- No items dropped at any scroll position

## 📦 Upgrading

### From v0.4.1 or v0.4.0

```bash
npm install -g mcp-toggle@0.4.2
```

**No breaking changes** - This is a bug fix release. All existing functionality remains the same.

### What to Expect

After upgrading, you should notice:
1. All items in the list are now visible when scrolling
2. Better visual hierarchy with highlighted token counts
3. Clearer navigation with highlighted key names
4. Improved selection contrast

## 🙏 Acknowledgments

Special thanks to the community for reporting the missing items bug and testing across different terminal sizes.

---

**Full Changelog**: [CHANGELOG.md](CHANGELOG.md)
**Issues**: Report bugs at https://github.com/machjesusmoto/mcp-toggle/issues
