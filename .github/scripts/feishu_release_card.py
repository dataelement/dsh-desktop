"""Card 2.0 views for the release gate; remote text is never used as markup."""
import re


def plain(text):
    return {'tag': 'plain_text', 'content': text}


def escape(text):
    return re.sub(r'[&<>*_`\[\]~]', lambda match: f'&#{ord(match.group())};', text)


def panel(title, text):
    return {'tag': 'column_set', 'flex_mode': 'none', 'columns': [
        {'tag': 'column', 'width': 'weighted', 'weight': 1, 'background_style': 'grey-50',
         'padding': '12px', 'vertical_spacing': '8px', 'elements': [
             {'tag': 'markdown', 'content': '**' + escape(title) + '**'},
             {'tag': 'markdown', 'content': escape(text)}]}]}


def button(label, action, revision, primary=False, form=False):
    value = {'tag': 'button', 'text': plain(label), 'width': 'fill',
             'type': 'primary_filled' if primary else 'default'}
    if form:
        value.update(name=f'{action}_{revision}', form_action_type='submit')
    else:
        value['behaviors'] = [{'type': 'callback', 'value': {'action': action, 'revision': revision}}]
    return value


def row(buttons):
    return {'tag': 'column_set', 'flex_mode': 'none', 'horizontal_spacing': '8px',
            'columns': [{'tag': 'column', 'width': 'weighted', 'weight': 1, 'elements': [item]} for item in buttons]}


def render(tag, notes, state, revision, draft='', error=''):
    elements = []
    if state == 'editing':
        elements.append({'tag': 'markdown', 'content':
                         '仅最初点击“重写”的人可以提交或取消；其他成员点击不会生效。如需换人，请由原编辑者先取消。'})
        if error:
            elements.append({'tag': 'markdown', 'content': '**尚未发布：** ' + escape(error)})
        elements.append({'tag': 'form', 'name': 'release_edit', 'vertical_spacing': '12px', 'elements': [
            {'tag': 'input', 'name': 'rewrite_zh', 'label': plain('中文发布文案'), 'width': 'fill',
             'default_value': draft, 'input_type': 'multiline_text', 'rows': 6, 'max_length': 1000,
             'placeholder': plain('每条以减号和空格（- ）开头；英文由系统翻译，无需填写')},
            row([button('提交并发布', 'submit', revision, True, True), button('取消', 'cancel', revision, form=True)])]})
        elements.append({'tag': 'markdown', 'text_size': 'notation', 'content':
                         '提交表示同意发布。文案校验及英文翻译通过后自动继续，无需再次确认。'})
    else:
        elements.extend([panel('中文', notes['zh']), panel('English', notes['en'])])
        if state == 'preview':
            elements.append(row([button('确认并发布', 'approve', revision, True), button('重写', 'rewrite', revision)]))
        else:
            label = {'processing': '处理中…', 'approved': '已确认，CI 将继续发布',
                     'expired': '已超时，未放行', 'failed': '处理失败，未放行'}[state]
            elements.append({'tag': 'button', 'text': plain(label), 'type': 'primary_filled',
                             'width': 'fill', 'disabled': True})
        elements.append({'tag': 'markdown', 'text_size': 'notation', 'content': escape(error or
                         '确认后继续正式发布；点击重写可修改中文，系统自动生成英文。')})
    return {'schema': '2.0', 'config': {'update_multi': True, 'width_mode': 'default', 'enable_forward': False},
            'header': {'title': plain(f'{tag} · 发布文案确认'),
                       'template': 'green' if state == 'approved' else 'blue',
                       'subtitle': plain('更新弹窗简版 · 中英文')},
            'body': {'direction': 'vertical', 'padding': '12px', 'vertical_spacing': '12px', 'elements': elements}}
