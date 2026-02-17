// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const styles = require('./styles');

const PinModal = ({ profileName, onSubmit, onCancel }) => {
    const [pin, setPin] = React.useState(['', '', '', '']);
    const [error, setError] = React.useState('');
    const inputRefs = React.useRef([]);

    React.useEffect(() => {
        // Focus first input on mount
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index, value) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value.slice(-1); // Only take last character
        setPin(newPin);
        setError('');

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            // Focus previous input on backspace if current is empty
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        const pinValue = pin.join('');
        if (pinValue.length !== 4) {
            setError('Please enter 4 digits');
            return;
        }
        onSubmit(pinValue);
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const digits = pastedData.replace(/\D/g, '').slice(0, 4).split('');

        const newPin = [...pin];
        digits.forEach((digit, index) => {
            if (index < 4) newPin[index] = digit;
        });
        setPin(newPin);

        // Focus the next empty input or last input
        const nextIndex = Math.min(digits.length, 3);
        inputRefs.current[nextIndex]?.focus();
    };

    return (
        <div className={styles['pin-modal-overlay']} onClick={onCancel}>
            <div className={styles['pin-modal']} onClick={(e) => e.stopPropagation()}>
                <div className={styles['modal-header']}>
                    <h2>Enter PIN</h2>
                    <p>Profile: {profileName}</p>
                </div>

                <div className={styles['pin-input-container']}>
                    {pin.map((digit, index) => (
                        <input
                            key={index}
                            ref={el => inputRefs.current[index] = el}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            className={error ? styles['error'] : ''}
                        />
                    ))}
                </div>

                {error && <div className={styles['error-message']}>{error}</div>}

                <div className={styles['modal-actions']}>
                    <button className={styles['cancel-btn']} onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className={styles['submit-btn']}
                        onClick={handleSubmit}
                        disabled={pin.join('').length !== 4}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

PinModal.propTypes = {
    profileName: PropTypes.string.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

module.exports = PinModal;
