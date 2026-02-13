const reportIssueModal = (triggerId, initialDescription = "") => {
    return {
        type: 'modal',
        callback_id: 'submit_issue',
        title: {
            type: 'plain_text',
            text: 'Report an IT Issue'
        },
        submit: {
            type: 'plain_text',
            text: 'Submit'
        },
        close: {
            type: 'plain_text',
            text: 'Cancel'
        },
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: 'Please describe your issue in detail. I will try to help you fix it, or create a ticket if needed.'
                }
            },
            {
                type: 'input',
                block_id: 'issue_description_block',
                element: {
                    type: 'plain_text_input',
                    action_id: 'issue_description',
                    multiline: true,
                    initial_value: initialDescription
                },
                label: {
                    type: 'plain_text',
                    text: 'Description'
                }
            },
            {
                type: 'input',
                block_id: 'issue_type_block',
                element: {
                    type: 'static_select',
                    action_id: 'issue_type',
                    placeholder: {
                        type: 'plain_text',
                        text: 'Select issue type'
                    },
                    options: [
                        {
                            text: { type: 'plain_text', text: 'Network / Internet' },
                            value: 'network'
                        },
                        {
                            text: { type: 'plain_text', text: 'Hardware (Printer, Laptop)' },
                            value: 'hardware'
                        },
                        {
                            text: { type: 'plain_text', text: 'Software / Access' },
                            value: 'software'
                        },
                        {
                            text: { type: 'plain_text', text: 'Other' },
                            value: 'other'
                        }
                    ]
                },
                label: {
                    type: 'plain_text',
                    text: 'Category'
                }
            }
        ]
    };
};

module.exports = { reportIssueModal };
